import { prisma } from "@/lib/db";
import { fmtPesa } from "@/lib/format";

const BEEM_URL = "https://apisms.beem.africa/public/v1/sender";

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
    `Kilichobaki (bidhaa hii): ${bakaa}`,
    `Deni lote unalodaiwa: ${jumla}`,
    ``,
    `Asante kwa malipo yako. Tafadhali endelea kulipa ili kumalizia deni lako. Tunakushukuru! - ${d.jinaDuka}`,
  ].join("\n");
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
 * Sends an SMS using the Beem Africa API. Returns false (without throwing)
 * when SMS is disabled or fails, matching the original `@tumaSMS` behaviour.
 */
export async function tumaSMS(namba: string, ujumbe: string): Promise<boolean> {
  const apiKey = process.env.BEEM_API_KEY;
  const apiSecret = process.env.BEEM_API_SECRET;

  if (!apiKey || !apiSecret) {
    await logSMS(namba, ujumbe, "pending");
    return false;
  }

  const payload = {
    source_addr: process.env.BEEM_SENDER || "INFO",
    encoding: 0,
    schedule_time: "",
    message: ujumbe,
    recipients: [{ recipient_id: "1", dest_addr: namba }],
  };

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set(
    "Authorization",
    "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")
  );

  try {
    const res = await fetch(BEEM_URL, {
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