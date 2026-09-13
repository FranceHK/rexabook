import type { Prisma } from "@prisma/client";

/** Convert a Prisma Decimal / number / string into a plain JS number. */
export function toMoney(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal (decimal.js) instances
  if (typeof value === "object") {
    const n = parseFloat(String((value as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Format money as "TZS 12,500" (integer, comma grouped). */
export function fmtPesa(value: unknown): string {
  const n = toMoney(value);
  return "TZS " + n.toLocaleString("en-TZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Format a date as dd/mm/yyyy. */
export function fmtTarehe(dt: Date | string | null | undefined): string {
  if (!dt) return "—";
  const d = toDate(dt);
  if (!d) return String(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Format a date with time as dd/mm/yyyy hh:mm. */
export function fmtTareheSaa(dt: Date | string | null | undefined): string {
  if (!dt) return "—";
  const d = toDate(dt);
  if (!d) return String(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value suitable for <input type="datetime-local">. */
export function toDatetimeLocal(dt: Date | string | null | undefined): string {
  const d = toDate(dt ?? new Date());
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value suitable for <input type="date">. */
export function toDateInput(dt: Date | string | null | undefined): string {
  const d = toDate(dt ?? new Date());
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDate(dt: Date | string): Date | null {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Parse an <input type="date"> value ("YYYY-MM-DD") as a local-time Date
 * (avoids the UTC midnight off-by-one that `new Date("YYYY-MM-DD")` causes).
 */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(.*))?$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  if (m[4]) {
    // allow an optional time component too
    const tm = m[4].match(/^(\d{1,2}):(\d{2})/);
    if (tm) date.setHours(Number(tm[1]), Number(tm[2]), 0, 0);
  }
  return date;
}

/** First character, uppercased (for avatars). */
export function initial(jina: string): string {
  return (jina || "?").trim().charAt(0).toUpperCase();
}

/** Localised human date, e.g. "13 Sep 2026". */
export function fmtTareheRefu(dt: Date | string | null | undefined): string {
  const d = toDate(dt ?? new Date());
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Percentage paid (0-100), clamped. */
export function pctPaid(asili: unknown, kilicholipwa: unknown): number {
  const a = toMoney(asili);
  const p = toMoney(kilicholipwa);
  if (a <= 0) return 0;
  return Math.min(100, Math.round((p / a) * 100));
}

/** Remaining balance for a debt. */
export function bakaa(asili: unknown, kilicholipwa: unknown): number {
  return Math.max(0, toMoney(asili) - toMoney(kilicholipwa));
}

export type MoneyDecimal = Prisma.Decimal | null | undefined;