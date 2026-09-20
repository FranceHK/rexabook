import { createHmac, timingSafeEqual } from "node:crypto";

const CODE_PATTERN = /^RX-(\d{6,})-([A-Z0-9_-]{8})$/;

function signatureFor(customerId: number): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "rexabook-public-access")
    .update(`customer:${customerId}`)
    .digest("base64url")
    .slice(0, 8)
    .toUpperCase();
}

export function customerPublicId(customerId: number): string {
  return `RX-${String(customerId).padStart(6, "0")}-${signatureFor(customerId)}`;
}

export function customerIdFromPublicCode(rawCode: string): number | null {
  const code = rawCode.trim().toUpperCase();
  const match = code.match(CODE_PATTERN);
  if (!match) return null;

  const customerId = Number(match[1]);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) return null;

  const expected = Buffer.from(signatureFor(customerId));
  const supplied = Buffer.from(match[2]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  return customerId;
}
