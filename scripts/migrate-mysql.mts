// =====================================================================
// scripts/migrate-mysql.mts
// ---------------------------------------------------------------------
// One-shot migration of the legacy MySQL "duka_madeni" database into the
// RexaBook PostgreSQL (Neon) schema.
//
// What it does
//  1. Reads `DATABASE_URL` and the `MYSQL_*` vars from `.env`.
//  2. Pulls every row from the MySQL tables in FK order.
//  3. Inserts them into Postgres with explicit ids (ids are preserved).
//  4. Plaintext legacy passwords are bcrypt-hashed (bcrypt-lookalike
//     hashes are left untouched).
//  5. `mizigo.risiti_picha` (a relative path like `uploads/risiti/x.jpg`)
//     is read from disk under `htdocs/` and stored as a base64 data URI
//     in `risitiPicha`, matching how the new app stores receipts.
//
// Run:  npm run db:migrate-mysql
// =====================================================================

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { hash } from "bcryptjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const ENV_PATH = join(ROOT, ".env");
const DEFAULT_HTDOCS = resolve(ROOT, "../htdocs");

// ---------------------------------------------------------------------
// Minimal .env loader (no dotenv dependency).
// ---------------------------------------------------------------------
function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = loadEnv(ENV_PATH);
const get = (k: string) => env[k] ?? process.env[k];

const REQUIRED = ["DATABASE_URL", "MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"] as const;
const missing = REQUIRED.filter((k) => !get(k));
if (missing.length) {
  console.error("Missing environment variable(s): " + missing.join(", ") + "\n");
  console.error("Copy .env.example to .env and fill in DATABASE_URL plus the MYSQL_* values first.");
  process.exit(1);
}

const HTDOCS = get("HTDOCS_DIR") ?? DEFAULT_HTDOCS;
const RISITI_DIR = join(HTDOCS, "uploads", "risiti");

const MYSQL = {
  host: get("MYSQL_HOST")!,
  user: get("MYSQL_USER")!,
  password: get("MYSQL_PASSWORD") ?? "",
  database: get("MYSQL_DATABASE")!,
  port: Number(get("MYSQL_PORT") ?? 3306),
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function log(step: string, n: number) {
  console.log(`  ✓ ${step.padEnd(26)} ${n} rows`);
}

function isBcrypt(s: string): boolean {
  return /^\$(2a|2b|2y)\$\d{2}\$/.test(s);
}

function toTimestamp(v: unknown): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toDate(v: unknown): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dataUriForReceipt(relPath: string | null): string | null {
  if (!relPath) return null;
  const base = relPath.split("/").pop() ?? relPath;
  const file = join(RISITI_DIR, base);
  if (!existsSync(file)) {
    console.warn(`    ! risiti file not found: ${relPath} (skipped)`);
    return null;
  }
  const ext = (base.split(".").pop() ?? "jpg").toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  const b64 = readFileSync(file).toString("base64");
  return `data:${mime};base64,${b64}`;
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  console.log("RexaBook · MySQL → PostgreSQL migration\n");
  console.log(`  MySQL source   : ${MYSQL.host}/${MYSQL.database}:${MYSQL.port}`);
  console.log(`  Risiti folder  : ${RISITI_DIR}\n`);

  // 1) Connect to Postgres through Prisma (reads DATABASE_URL too).
  let prisma: any;
  try {
    ({ PrismaClient: prisma } = await import("@prisma/client"));
    prisma = new prisma();
  } catch {
    console.error("  ✗ Could not initialize Prisma. Run `npm run db:generate` (needs DATABASE_URL in .env).");
    process.exit(1);
  }

  // 2) Connect to MySQL.
  const source = await mysql.createConnection({ ...MYSQL, charset: "utf8mb4" }).catch((e) => {
    console.error("  ✗ Could not connect to MySQL: " + e.message);
    process.exit(1);
  });

  try {
    // 3) Safety: refuse to overwrite a non-empty database unless forced.
    if (!process.argv.includes("--force")) {
      const [{ count }]: any = await prisma.$queryRawUnsafe("SELECT COUNT(*)::int AS count FROM watumiaji");
      if (Number(count) > 0) {
        console.error(
          "  ✗ Target database already contains data. Run with `--force` to truncate and re-import."
        );
        process.exit(1);
      }
    } else {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "mizigo_bidhaa", "mizigo", "sms_log", "malipo", "madeni", "wateja", "watumiaji" RESTART IDENTITY CASCADE');
      console.log("  ✓ Target tables truncated.\n");
    }

    // 4) Discover the columns each MySQL table actually has.
    const columnSet = new Map<string, Set<string>>();
    for (const table of ["watumiaji", "wateja", "madeni", "malipo", "sms_log", "mizigo", "mizigo_bidhaa"]) {
      const [cols]: any = await source.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [MYSQL.database, table]
      );
      columnSet.set(table, new Set(cols.map((c: any) => c.COLUMN_NAME)));
    }
    const has = (t: string, c: string) => columnSet.get(t)?.has(c) ?? false;

    // 5) watumiaji -> User
    const [users]: any = await source.query("SELECT * FROM watumiaji ORDER BY id");
    for (const row of users) {
      const nenosiri = String(row.nenosiri ?? "");
      const finalPass = isBcrypt(nenosiri) ? nenosiri : await hash(nenosiri, 10);
      await prisma.$executeRawUnsafe(
        `INSERT INTO watumiaji (id, jina, nenosiri, jina_duka, simu, "tareheKuundwa")
         VALUES ($1::int, $2::text, $3::text, $4::text, $5::text, $6::timestamp)`,
        row.id,
        String(row.jina ?? ""),
        finalPass,
        String(row.jina_duka ?? ""),
        has("watumiaji", "simu") && row.simu != null ? String(row.simu) : null,
        toTimestamp(row.tarehe_kuundwa)
      );
    }
    log("watumiaji → watumiaji", users.length);

    // 6) wateja -> Customer
    const [customers]: any = await source.query("SELECT * FROM wateja ORDER BY id");
    for (const row of customers) {
      const hasSimu = has("wateja", "simu");
      const hasLoc = has("wateja", "location");
      await prisma.$executeRawUnsafe(
        `INSERT INTO wateja (id, "mtumiajiId", jina, simu, location, "tareheKuandikishwa")
         VALUES ($1::int, $2::int, $3::text, $4::text, $5::text, $6::timestamp)`,
        row.id,
        row.mtumiaji_id ?? null,
        String(row.jina ?? ""),
        hasSimu && row.simu != null ? String(row.simu) : null,
        hasLoc && row.location != null ? String(row.location) : null,
        toTimestamp(row.tarehe_kuandikishwa)
      );
    }
    log("wateja → wateja", customers.length);

    // 7) madeni -> Debt
    const [debts]: any = await source.query("SELECT * FROM madeni ORDER BY id");
    for (const row of debts) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO madeni (id, "mtejaId", "mtumiajiId", "jinaBidhaa", "kiasiAsili", "kiasiKilicholipwa", "tareheKukopa", maelezo, imekamilika)
         VALUES ($1::int, $2::int, $3::int, $4::text, $5::numeric, $6::numeric, $7::timestamp, $8::text, $9::bool)`,
        row.id,
        row.mteja_id ?? null,
        row.mtumiaji_id ?? null,
        row.jina_bidhaa != null ? String(row.jina_bidhaa) : null,
        row.kiasi_asili != null ? Number(row.kiasi_asili) : null,
        row.kiasi_kilicholipwa != null ? Number(row.kiasi_kilicholipwa) : 0,
        toTimestamp(row.tarehe_kukopa),
        row.maelezo != null ? String(row.maelezo) : null,
        Number(row.imekamilika) === 1
      );
    }
    log("madeni → madeni", debts.length);

    // 8) malipo -> Payment
    const [payments]: any = await source.query("SELECT * FROM malipo ORDER BY id");
    for (const row of payments) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO malipo (id, "deniId", kiasi, tarehe, maelezo)
         VALUES ($1::int, $2::int, $3::numeric, $4::timestamp, $5::text)`,
        row.id,
        row.deni_id ?? null,
        Number(row.kiasi),
        toTimestamp(row.tarehe),
        row.maelezo != null ? String(row.maelezo) : null
      );
    }
    log("malipo → malipo", payments.length);

    // 9) sms_log -> SmsLog
    const [sms]: any = await source.query("SELECT * FROM sms_log ORDER BY id");
    const STATUSES = new Set(["success", "failed", "pending"]);
    for (const row of sms) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO sms_log (id, namba, ujumbe, status, response, tarehe)
         VALUES ($1::int, $2::text, $3::text, $4::"SmsStatus", $5::text, $6::timestamp)`,
        row.id,
        String(row.namba ?? ""),
        String(row.ujumbe ?? ""),
        STATUSES.has(String(row.status ?? "")) ? row.status : "pending",
        row.response != null ? String(row.response) : null,
        toTimestamp(row.tarehe)
      );
    }
    log("sms_log → sms_log", sms.length);

    // 10) mizigo -> Cargo (risiti path -> data URI)
    const [cargos]: any = await source.query("SELECT * FROM mizigo ORDER BY id");
    for (const row of cargos) {
      const hali = String(row.hali ?? "Haijafika");
      const finalHali = hali === "Imefika" ? "Imefika" : "Haijafika";
      const risiti: string | null = has("mizigo", "risiti_picha")
        ? dataUriForReceipt(row.risiti_picha ?? null)
        : null;
      await prisma.$executeRawUnsafe(
        `INSERT INTO mizigo (id, "mtumiajiId", "jinaKampuni", "jumlaGharama", "ainaUsafiri", "nambariTracking", "tareheKuagiza", "tareheKutarajiwa", "tareheKufikaHalisi", hali, maelezo, "risitiPicha")
         VALUES ($1::int, $2::int, $3::text, $4::numeric, $5::text, $6::text, $7::date, $8::date, $9::date, $10::"Hali", $11::text, $12::text)`,
        row.id,
        row.mtumiaji_id ?? null,
        String(row.jina_kampuni ?? ""),
        row.jumla_gharama != null ? Number(row.jumla_gharama) : 0,
        row.aina_usafiri != null ? String(row.aina_usafiri) : null,
        row.nambari_tracking != null ? String(row.nambari_tracking) : null,
        toDate(row.tarehe_kuagiza),
        toDate(row.tarehe_kutarajiwa),
        toDate(row.tarehe_kufika_halisi),
        finalHali,
        row.maelezo != null ? String(row.maelezo) : null,
        risiti
      );
    }
    log("mizigo → mizigo", cargos.length);

    // 11) mizigo_bidhaa -> CargoItem
    const [items]: any = await source.query("SELECT * FROM mizigo_bidhaa ORDER BY id");
    for (const row of items) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO mizigo_bidhaa (id, "mzigoId", "jinaBidhaa", idadi, kitengo, "beiKwaKipande", jumla)
         VALUES ($1::int, $2::int, $3::text, $4::int, $5::text, $6::numeric, $7::numeric)`,
        row.id,
        row.mzigo_id,
        String(row.jina_bidhaa ?? ""),
        Number(row.idadi),
        row.kitengo != null ? String(row.kitengo) : "pc",
        Number(row.bei_kwa_kipande ?? 0),
        Number(row.jumla ?? 0)
      );
    }
    log("mizigo_bidhaa → mizigo_bidhaa", items.length);

    // 12) Reset auto-increment sequences so new rows never collide with imported ids.
    for (const table of ["watumiaji", "wateja", "madeni", "malipo", "sms_log", "mizigo", "mizigo_bidhaa"]) {
      await prisma.$queryRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT MAX(id) FROM ${table}), 1))`
      );
    }

    console.log("\n  ✓ Migration complete.");
  } catch (e) {
    console.error("\n  ✗ Migration failed:");
    console.error("    ", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await source.end();
    await prisma.$disconnect();
  }
}

main();