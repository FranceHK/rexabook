import { prisma } from "@/lib/db";
import { fmtPesa } from "@/lib/format";

const MESEJI_URL = "https://meseji.co.tz/api/v1/sms/send";

/**
 * SMS sending is best-effort, exactly like the original PHP app:
 * if sending fails or is not configured, the payment flow continues.
 */

export interface MalipoSMSData {
  jinaMteja: string;
  malipoKiasi: number;
  bidhaa: string;
  bakaaBidhaa: number;
  jumlaMadeniYote: number;
  jinaDuka: string;
}

/**
 * Builds the Swahili SMS message sent to a customer after a payment,
 * preserving the three scenarios from the original implementation:
 *   1. everything paid off  2. this product paid, other debts remain
 *   3. balance still remaining on this product.
 */
export function buildMalipoSMS(d: MalipoSMSData): string {
  const lipa = fmtPesa(d.malipoKiasi);
  const bakaa = fmtPesa(d.bakaaBidhaa);
  const jumla = fmtPesa(d.jumlaMadeniYote);

  if (d.bakaaBidhaa <= 0 && d.jumlaMadeniYote <= 0) {
    return [
      `Habari ${d.jinaMteja},`,
      ``,
      `Malipo ya ${lipa} yamepokewa.`,
      `Bidhaa: ${d.bidhaa} - IMELIPWA KIKAMILIFU ✓`,
      ``,
      `Hongera! Huna deni lolote tena kwenye ${d.jinaDuka}.`,
      `Tunakushukuru kwa uaminifu wako. Karibu tena wakati wowote!`,
    ].join("\n");
  }

  if (d.bakaaBidhaa <= 0) {
    return [
      `Habari ${d.jinaMteja},`,
      ``,
      `Malipo ya ${lipa} yamepokewa.`,
      `Bidhaa: ${d.bidhaa} - IMELIPWA KIKAMILIFU ✓`,
      ``,
      `Deni lote unalodaiwa: ${jumla}`,
      ``,
      `Asante sana kwa kulipa. Endelea hivyo hivyo, tunakuamini! - ${d.jinaDuka}`,
    ].join("\n");
  }

  return [
    `Habari ${d.jinaMteja},`,
    ``,
    `Malipo ya ${lipa} yamepokewa.`,
    `Bidhaa: ${d.bidhaa}`,
    `Imebaki (bidhaa hii): ${bakaa}`,
    `Deni lote unalodaiwa: ${jumla}`,
    ``,
    `Asante kwa malipo yako. Tafadhali endelea kulipa ili kumalizia deni lako. Tunakushukuru! - ${d.jinaDuka}`,
  ].join("\n");
}

export interface DeniSMSData {
  jinaMteja: string;
  bidhaa: string;
  kiasi: number;
  maelezo?: string;
  jinaDuka: string;
}

/** SMS sent to a customer when a new debt is registered. */
export function buildDeniSMS(d: DeniSMSData): string {
  return [
    `Habari ${d.jinaMteja},`,
    ``,
    `Umeongezewa deni: ${d.bidhaa}`,
    `Kiasi: ${fmtPesa(d.kiasi)}`,
    d.maelezo ? `Maelezo: ${d.maelezo}` : null,
    ``,
    `Tafadhali lipa kwa wakati uliokubaliwa. Asante kwa uaminifu wako! - ${d.jinaDuka}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/**
 * Normalizes a Tanzanian phone number to MSISDN format (255 + 9 digits),
 * e.g. "0758285358" → "255758285358", "+255 766 456 786" → "255766456786".
 */
export function normalizePhone(namba: string): string {
  let n = namba.replace(/[\s\-().]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("255")) n = n.slice(3);
  if (n.startsWith("0")) n = n.slice(1);
  if (!/^\d{9}$/.test(n)) return namba;
  return `255${n}`;
}

/** Inserts an SMS log row (used for records). */
export async function logSMS(namba: string, ujumbe: string, status: "success" | "failed" | "pending", response?: string) {
  try {
    await prisma.smsLog.create({
      data: {
        namba,
        ujumbe,
        status,
        response: response ? String(response).slice(0, 2000) : null,
      },
    });
  } catch {
    // logging must never break the payment flow
  }
}

/**
 * Sends an SMS using the Meseji API. Returns false (without throwing)
 * when SMS is disabled or fails, matching the original `@tumaSMS` behaviour.
 */
export async function tumaSMS(namba: string, ujumbe: string): Promise<boolean> {
  const apiKey = process.env.MESEJI_API_KEY;

  if (!apiKey) {
    await logSMS(namba, ujumbe, "pending");
    return false;
  }

  const payload = {
    sender_id: process.env.MESEJI_SENDER || "MESEJI",
    message: ujumbe,
    contacts: normalizePhone(namba),
  };

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("x-api-key", apiKey);

  try {
    const res = await fetch(MESEJI_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    const success = res.status === 200;
    await logSMS(namba, ujumbe, success ? "success" : "failed", body);
    return success;
  } catch (err) {
    await logSMS(namba, ujumbe, "failed", err instanceof Error ? err.message : String(err));
    return false;
  }
}