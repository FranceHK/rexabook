# RexaBook

Modern business management system — a from-scratch migration of the legacy PHP/MySQL **"Duka Madeni"** app into a Next.js 15 (App Router) application backed by PostgreSQL (Neon).

Everything a small shop needs in one Swahili-first app:

- **Wadaiwa (Customers)** — customer cards, overview stats
- **Madeni (Debts)** — record credit, track paid amounts, payment history
- **Malipo (Payments)** — record partial payments with optional Meseji SMS notifications
- **Mizigo (Cargo tracking)** — shipments with multiple items, receipt photo uploads
- **PDF Reports** — per customer: rekodi ya madeni / malipo / muhtasari
- **Mipangilio (Settings)** — update profile, change password

## Tech stack

- **Next.js 15** (App Router), React 19, TypeScript (strict)
- **Tailwind CSS v4** (`@tailwindcss/postcss`) — class-based dark mode, default dark
- **Prisma 6** over PostgreSQL (Neon)
- **Auth** — stateless JWT (jose) in an httpOnly secure cookie, bcryptjs password hashing
- **PDF** — `pdf-lib`, served by `GET /api/pdf`
- **SMS** — Meseji delivery, prepaid wallets, direct Snippe mobile-money payments, and admin profit reporting

## Getting started

```bash
npm install
cp .env.example .env
npm run db:migrate   # or: npx prisma migrate dev / db push
npm run dev
```

Open http://localhost:3000 — the first visitor can register a shop account.

### Environment variables (see `.env.example`)

| Variable          | Required | Purpose                                   |
| ----------------- | -------- | ----------------------------------------- |
| `DATABASE_URL`    | yes      | Neon pooled connection string             |
| `SESSION_SECRET`  | yes      | Cookie signing key (`openssl rand -base64 32`) |
| `NEXTAUTH_URL`    | no       | Base URL for cookies/redirects            |
| `MESEJI_API_KEY` or `MESEJI_TOKEN` | no | Meseji authentication (`x-api-key` or Bearer token) |
| `MESEJI_SENDER` | no | Approved Meseji sender ID (default `MESEJI`) |
| `SNIPPE_API_KEY` | no | Server-side Snippe key for direct mobile-money collections |
| `SNIPPE_WEBHOOK_SECRET` | no | Secret used to verify signed Snippe webhooks |
| `SNIPPE_WEBHOOK_URL` | production | Public HTTPS callback; defaults to `NEXTAUTH_URL/api/webhooks/snippe` |
| `MYSQL_*`         | only migration | Legacy MySQL source connection       |

## Database

The Prisma schema (`prisma/schema.prisma`) maps model names/camelCase columns to the original MySQL table/column names via `@@map` / `@map`. Names of physical tables and columns that the app talks to are:

| Prisma model | Table  | Notes                                  |
| ------------ | ------ | -------------------------------------- |
| User         | watumiaji | `tareheKuundwa` = created_at        |
| Customer     | wateja    | `mtumiajiId` = owner                  |
| Debt         | madeni    | `tareheKukopa` = DATE                |
| Payment      | malipo    | decimal `kiasi`, cascade on debt      |
| SmsLog       | sms_log   | enum status success/failed/pending    |
| SmsPurchase  | sms_manunuzi | SMS credit purchase requests        |
| SmsTransaction | sms_miamala | Credit purchase, usage and refunds |
| Cargo        | mizigo    | enum hali Haijafika/Imefika           |
| CargoItem    | mizigo_bidhaa | `mzigoId` = parent cargo           |

Non-default index creation and any future schema changes go through Prisma migrations:

```bash
npm run db:migrate     # create + apply a migration
npm run db:deploy      # apply migrations (CI/production)
npm run db:studio      # inspect data
```

## Migrating from the legacy MySQL database

There are two import paths. Both preserve ids, bcrypt-hash plaintext passwords (already-bcrypt
`$2a$`/`$2b$`/`$2y$` hashes pass through untouched), convert `mizigo.risiti_picha` into a base64 data
URI (reading the file from `htdocs/uploads/risiti/`), refuse to run on a non-empty database unless
`--force` is passed (truncates all 7 tables + re-imports), and reset the serial sequences to `MAX(id)`.

### A. Import from a phpMyAdmin SQL dump (no MySQL server needed)

Useful when the legacy host is no longer reachable. Run:

```bash
npm run db:import-dump -- --file /path/to/export.sql
npm run db:import-dump -- --file /path/to/export.sql --force   # re-import
```

Defaults: dump file `/Users/mac/Documents/ezyro_41553425_magicbook.sql` (or `DUMP_FILE`),
receipts folder `../htdocs/uploads/risiti` (or `HTDOCS_DIR`).
See `scripts/import-dump.mts`.

### B. Import from a live MySQL server

The old app lives in `../htdocs` (a plain PHP/MySQL site using `ezyro_41553425_magicbook`). To pull
its data into PostgreSQL:

1. Fill `DATABASE_URL` and the `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT` values in `.env`.
2. (Receipt photos) make sure your local checkout contains the old `htdocs/uploads/risiti/` files.
3. Run:

```bash
npm run db:migrate-mysql
```

`HTDOCS_DIR` env var overrides where `uploads/risiti` is looked up (default `../htdocs`).

### Documented divergences from the original

1. **Receipt images** — stored as base64 data URIs in `risitiPicha` (text column) instead of files on disk. No per-user upload directories.
2. **Passwords** — migrated plaintext passwords are bcrypt-hashed; the app also falls back to plaintext comparison so pre-migration accounts can still log in until their next password change.
3. **Column `watumiaji.simu`** — optional in the new app; the original `database.sql` did not define it (treated as added later / ignored if absent).
4. **Dates** — `DATE` valued (`tareheKukopa`, cargo dates) are mapped to PostgreSQL date/timestamp; SMS/payment timestamps preserve MySQL timezone as-is.
5. **`sms_log`** — the merged cascade variant (`sms_log_table.sql`) is used as canonical (indexed + enum `status`).

## Authentication & authorization

- Cookie `rexabook_session` is a signed JWT; `middleware.ts` protects `/dashboard`, `/customers`, `/cargo`, `/settings`.
- Ownership is enforced at the query level via `mtumiajiId` everywhere (server actions and the PDF route re-check the user).
- Client-side state uses server actions + `revalidatePath`; the UI is progressive-enhancement friendly.

## Notes for developers

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint . (flat config)
npm run build       # next build
```

- The three lint warnings about `<img>` are intentional: receipt photos are base64 data URIs, so `next/image` optimization does not apply.
- Meseji SMS is best-effort: failures are logged and never block debt/payment records. Reserved SMS credits are refunded when delivery fails.
- Snippe payments use signed, idempotent webhooks. The minimum purchase is 25 SMS (TZS 500), and credits are added only after Snippe reports a completed payment.
- PDF generation runs on a server route (`GET /api/pdf`); include `mteja_id`, `report_type` (`madeni`|`malipo`|`muhtasari`), optional `start_date`/`end_date` and `include_payments=1`.
