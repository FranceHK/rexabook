// =====================================================================
// scripts/import-dump.mts
// ---------------------------------------------------------------------
// Imports a phpMyAdmin SQL dump of the legacy MySQL "duka_madeni"
// database into the RexaBook PostgreSQL (Neon) schema.
//
// Use this when the source MySQL server is no longer reachable and you
// only have the export file (the flow in scripts/migrate-mysql.mts reads
// from a live MySQL server instead).
//
// What it does
//  1. Parses every `INSERT INTO` block from the dump (handles backslash
//     escapes, multi-line strings, multi-row VALUES).
//  2. Inserts the rows into Postgres with explicit ids (ids preserved),
//     in foreign-key order (watumiaji → wateja → madeni → malipo →
//     sms_log → mizigo → mizigo_bidhaa).
//  3. Legacy plaintext passwords are bcrypt-hashed; already-hashed
//     bcrypt (`$2a$`/`$2b$`/`$2y$`) values are left untouched.
//  4. `mizigo.risiti_picha` (relative path, e.g. `uploads/risiti/x.jpg`)
//     is read from disk under `htdocs/` and stored as a base64 data URI
//     in `risitiPicha`, matching how the new app stores receipts.
//  5. Resets each serial sequence to MAX(id) so new rows never collide.
//
// Run:  npm run db:import-dump -- --file /path/to/dump.sql
//       (defaults to DM_DUMP_FILE env or
//        /Users/mac/Documents/ezyro_41553425_magicbook.sql)
// =====================================================================

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const ENV_PATH = join(ROOT, ".env");
const DEFAULT_HTDOCS = resolve(ROOT, "../htdocs");
const DEFAULT_DUMP = "/Users/mac/Documents/ezyro_41553425_magicbook.sql";

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

const DATABASE_URL = get("DATABASE_URL");
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Fill it in .env first.");
  process.exit(1);
}

const HTDOCS = get("HTDOCS_DIR") ?? DEFAULT_HTDOCS;
const RISITI_DIR = join(HTDOCS, "uploads", "risiti");

const argv = process.argv.slice(2);
const fileFlag = argv.indexOf("--file");
const DUMP_FILE = fileFlag !== -1 ? argv[fileFlag + 1] : get("DUMP_FILE") ?? DEFAULT_DUMP;

if (!existsSync(DUMP_FILE)) {
  console.error(`Dump file not found: ${DUMP_FILE}`);
  console.error("Pass one with: --file /path/to/dump.sql  (or set DUMP_FILE / DM_DUMP_FILE)");
  process.exit(1);
}

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
// SQL dump parsing
// ---------------------------------------------------------------------

type Scalar = { q: boolean; v: string };
type Token = Scalar | "(" | ")" | ",";

function tokenize(sql: string, start: number): Token[] {
  const tokens: Token[] = [];
  let i = start;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      let out = "";
      while (j < n) {
        const c = sql[j];
        if (c === "\\") {
          const e = sql[j + 1];
          if (e === "n") out += "\n";
          else if (e === "r") out += "\r";
          else if (e === "t") out += "\t";
          else if (e === "b") out += "\b";
          else if (e === "0") out += "\0";
          else if (e === "Z") out += "\u001a";
          else if (e === "'" || e === '"' || e === "\\" || e === "%" || e === "_") out += e;
          else out += e;
          j += 2;
        } else if (c === "'") {
          if (sql[j + 1] === "'") {
            out += "'";
            j += 2;
          } else {
            j++;
            break;
          }
        } else {
          out += c;
          j++;
        }
      }
      tokens.push({ q: true, v: out });
      i = j;
    } else if (ch === "(" || ch === ")" || ch === ",") {
      tokens.push(ch);
      i++;
    } else if (ch === "`") {
      let j = i + 1;
      let acc = "";
      while (j < n && sql[j] !== "`") acc += sql[j++];
      tokens.push({ q: true, v: acc });
      i = j + 1;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      let j = i;
      while (j < n && !/[\s(),`']/.test(sql[j])) j++;
      tokens.push({ q: false, v: sql.slice(i, j) });
      i = j;
    }
  }
  return tokens;
}

/** Slice from `start` to the statement-ending `;` outside of strings. */
function sliceUntilSemicolon(sql: string, start: number): string {
  let i = start;
  let inStr = false;
  while (i < sql.length) {
    const ch = sql[i];
    if (inStr) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        inStr = false;
      }
    } else {
      if (ch === "'") {
        inStr = true;
      } else if (ch === ";") {
        return sql.slice(start, i);
      }
    }
    i++;
  }
  return sql.slice(start);
}

function parseTuples(tokens: Token[]): Scalar[][] {
  const rows: Scalar[][] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] !== "(") {
      i++;
      continue;
    }
    i++;
    const row: Scalar[] = [];
    let acc: string[] = [];
    let depth = 1;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === "(") depth++;
      else if (t === ")") {
        depth--;
        if (depth === 0) {
          if (acc.length) {
            row.push({ q: false, v: acc.join("").trim() });
            acc = [];
          }
          break;
        } else acc.push("(");
      } else if (t === ",") {
        if (depth === 1) {
          row.push({ q: false, v: acc.join("").trim() });
          acc = [];
        } else acc.push(",");
      } else acc.push(t.v);
      i++;
    }
    rows.push(row);
    i++;
  }
  return rows;
}

function nullOf(t: Scalar | undefined): unknown {
  if (!t) return null;
  if (!t.q && t.v.toUpperCase() === "NULL") return null;
  return t.v;
}

function strOf(t: Scalar | undefined): string | null {
  const v = nullOf(t);
  return v == null ? null : String(v);
}

function numOf(t: Scalar | undefined): number | null {
  const v = nullOf(t);
  return v == null ? null : Number(v);
}

function intOf(t: Scalar | undefined): number | null {
  const v = nullOf(t);
  return v == null ? null : Number(v);
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  console.log("RexaBook · SQL dump import → PostgreSQL\n");
  console.log(`  Dump file  : ${DUMP_FILE}`);
  console.log(`  Risiti dir : ${RISITI_DIR}\n`);

  const sql = readFileSync(DUMP_FILE, "utf8");

  // Collect table -> rows keyed by column name.
  const tables = new Map<string, Array<Record<string, Scalar>>>();
  const insertRe = /INSERT\s+INTO\s+`([^`]+)`\s*\(([^)]*)\)\s*VALUES/gi;

  let m: RegExpExecArray | null;
  let parsed = 0;
  while ((m = insertRe.exec(sql))) {
    const table = m[1];
    const columns = Array.from(m[2].matchAll(/`([^`]+)`/g)).map((c) => c[1]);
    const end = sliceUntilSemicolon(sql, m.index + m[0].length);
    const tokens = tokenize(end, 0);
    const tuples = parseTuples(tokens);
    const rows = tuples.map((tuple) => {
      const row: Record<string, Scalar> = {};
      columns.forEach((col, idx) => {
        row[col] = tuple[idx] ?? { q: false, v: "NULL" };
      });
      return row;
    });
    if (!tables.has(table)) tables.set(table, []);
    tables.get(table)!.push(...rows);
    parsed += rows.length;
  }

  if (parsed === 0) {
    console.error("  ✗ No INSERT statements found in the dump. Is the file a MySQL/phpMyAdmin export?");
    process.exit(1);
  }
  console.log(`  Parsed ${parsed} rows from the dump.\n`);

  // Connect to Postgres.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // Order of INSERTs (foreign keys). Ids are preserved.
  interface TableOrder {
    table: string;
    ddl: string;
  }
  const order: TableOrder[] = [
    { table: "watumiaji", ddl: "" },
    { table: "wateja", ddl: "" },
    { table: "madeni", ddl: "" },
    { table: "malipo", ddl: "" },
    { table: "sms_log", ddl: "" },
    { table: "mizigo", ddl: "" },
    { table: "mizigo_bidhaa", ddl: "" },
  ];

  try {
    if (!process.argv.includes("--force")) {
      const [{ count }]: any = await prisma.$queryRawUnsafe("SELECT COUNT(*)::int AS count FROM watumiaji");
      if (Number(count) > 0) {
        console.error("  ✗ Target database already contains data. Run with `--force` to truncate and re-import.");
        process.exit(1);
      }
    } else {
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "mizigo_bidhaa", "mizigo", "sms_log", "malipo", "madeni", "wateja", "watumiaji" RESTART IDENTITY CASCADE'
      );
      console.log("  ✓ Target tables truncated.\n");
    }

    for (const { table } of order) {
      const rows = tables.get(table) ?? [];
      switch (table) {
        case "watumiaji": {
          for (const r of rows) {
            const nenosiri = strOf(r.nenosiri) ?? "";
            const finalPass = isBcrypt(nenosiri) ? nenosiri : await hash(nenosiri, 10);
            await prisma.$executeRawUnsafe(
              `INSERT INTO watumiaji (id, jina, nenosiri, jina_duka, simu, "tareheKuundwa")
               VALUES ($1::int, $2::text, $3::text, $4::text, $5::text, $6::timestamp)`,
              intOf(r.id),
              strOf(r.jina) ?? "",
              finalPass,
              strOf(r.jina_duka) ?? "",
              strOf(r.simu),
              toTimestamp(nullOf(r.tarehe_kuundwa))
            );
          }
          break;
        }
        case "wateja": {
          for (const r of rows) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO wateja (id, "mtumiajiId", jina, simu, location, "tareheKuandikishwa")
               VALUES ($1::int, $2::int, $3::text, $4::text, $5::text, $6::timestamp)`,
              intOf(r.id),
              intOf(r.mtumiaji_id),
              strOf(r.jina) ?? "",
              strOf(r.simu),
              strOf(r.location),
              toTimestamp(nullOf(r.tarehe_kuandikishwa))
            );
          }
          break;
        }
        case "madeni": {
          for (const r of rows) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO madeni (id, "mtejaId", "mtumiajiId", "jinaBidhaa", "kiasiAsili", "kiasiKilicholipwa", "tareheKukopa", maelezo, imekamilika)
               VALUES ($1::int, $2::int, $3::int, $4::text, $5::numeric, $6::numeric, $7::timestamp, $8::text, $9::bool)`,
              intOf(r.id),
              intOf(r.mteja_id),
              intOf(r.mtumiaji_id),
              strOf(r.jina_bidhaa),
              numOf(r.kiasi_asili),
              numOf(r.kiasi_kilicholipwa) ?? 0,
              toTimestamp(nullOf(r.tarehe_kukopa)),
              strOf(r.maelezo),
              (intOf(r.imekamilika) ?? 0) === 1
            );
          }
          break;
        }
        case "malipo": {
          for (const r of rows) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO malipo (id, "deniId", kiasi, tarehe, maelezo)
               VALUES ($1::int, $2::int, $3::numeric, $4::timestamp, $5::text)`,
              intOf(r.id),
              intOf(r.deni_id),
              numOf(r.kiasi),
              toTimestamp(nullOf(r.tarehe)),
              strOf(r.maelezo)
            );
          }
          break;
        }
        case "sms_log": {
          const STATUSES = new Set(["success", "failed", "pending"]);
          for (const r of rows) {
            const status = strOf(r.status) ?? "";
            await prisma.$executeRawUnsafe(
              `INSERT INTO sms_log (id, namba, ujumbe, status, response, tarehe)
               VALUES ($1::int, $2::text, $3::text, $4::"SmsStatus", $5::text, $6::timestamp)`,
              intOf(r.id),
              strOf(r.namba) ?? "",
              strOf(r.ujumbe) ?? "",
              STATUSES.has(status) ? status : "pending",
              strOf(r.response),
              toTimestamp(nullOf(r.tarehe))
            );
          }
          break;
        }
        case "mizigo": {
          for (const r of rows) {
            const hali = strOf(r.hali) ?? "Haijafika";
            await prisma.$executeRawUnsafe(
              `INSERT INTO mizigo (id, "mtumiajiId", "jinaKampuni", "jumlaGharama", "ainaUsafiri", "nambariTracking", "tareheKuagiza", "tareheKutarajiwa", "tareheKufikaHalisi", hali, maelezo, "risitiPicha")
               VALUES ($1::int, $2::int, $3::text, $4::numeric, $5::text, $6::text, $7::date, $8::date, $9::date, $10::"Hali", $11::text, $12::text)`,
              intOf(r.id),
              intOf(r.mtumiaji_id),
              strOf(r.jina_kampuni) ?? "",
              numOf(r.jumla_gharama) ?? 0,
              strOf(r.aina_usafiri),
              strOf(r.nambari_tracking),
              toDate(nullOf(r.tarehe_kuagiza)),
              toDate(nullOf(r.tarehe_kutarajiwa)),
              toDate(nullOf(r.tarehe_kufika_halisi)),
              hali === "Imefika" ? "Imefika" : "Haijafika",
              strOf(r.maelezo),
              dataUriForReceipt(strOf(r.risiti_picha))
            );
          }
          break;
        }
        case "mizigo_bidhaa": {
          for (const r of rows) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO mizigo_bidhaa (id, "mzigoId", "jinaBidhaa", idadi, kitengo, "beiKwaKipande", jumla)
               VALUES ($1::int, $2::int, $3::text, $4::int, $5::text, $6::numeric, $7::numeric)`,
              intOf(r.id),
              intOf(r.mzigo_id),
              strOf(r.jina_bidhaa) ?? "",
              intOf(r.idadi) ?? 0,
              strOf(r.kitengo) ?? "pc",
              numOf(r.bei_kwa_kipande) ?? 0,
              numOf(r.jumla) ?? 0
            );
          }
          break;
        }
        default:
          break;
      }
      log(table, rows.length);
    }

    // Reset auto-increment sequences so new rows never collide with imported ids.
    for (const { table } of order) {
      await prisma.$queryRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST((SELECT MAX(id) FROM ${table}), 1))`
      );
    }

    console.log("\n  ✓ Import complete. Sequences reset.");
  } catch (e) {
    console.error("\n  ✗ Import failed:");
    console.error("    ", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();