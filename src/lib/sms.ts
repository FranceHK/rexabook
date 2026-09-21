import { prisma } from "@/lib/db";
import {
  SMS_PROVIDER_COST,
  SMS_SELLING_PRICE,
  countSmsUnits,
} from "@/lib/sms-pricing";

const MESEJI_URL = "https://meseji.co.tz/api/v1/sms/send";

/**
 * SMS sending is best-effort, exactly like the original PHP app:
 * if sending fails or is not configured, the payment flow continues.
 */

export interface MalipoSMSData {
  jinaMteja: string;
  malipoKiasi: number;
  bidhaa: string;
  kiasiDeni: number;
  bakaaBidhaa: number;
  jumlaMadeniYote: number;
  jinaDuka: string;
}

export interface KumbushoSMSData {
  jinaMteja: string;
  jinaDuka: string;
  deniLililobaki: number;
  yanayoendelea: number;
  bidhaaZilizobaki: string[];
}

/** Branded shop name shown at the start of every SMS. */
function shopHeader(jinaDuka: string): string {
  return (jinaDuka || "DUKA").trim().toUpperCase();
}

/** Formats money as "TSh 50,000" (as used in the official SMS templates). */
function tsh(value: number): string {
  return "TSh " + Math.round(value).toLocaleString("en-TZ");
}

/**
 * Template #1 – Customer created:
 * "MSAFIRI STORE: Habari [Jina], akaunti yako ya madeni imefunguliwa kwa mafanikio.
 *  Karibu na asante kwa kufanya biashara nasi."
 */
export function buildMtejaMpyaSMS(d: { jinaMteja: string; jinaDuka: string }): string {
  return `${shopHeader(d.jinaDuka)}: Habari ${d.jinaMteja}, akaunti yako ya madeni imefunguliwa kwa mafanikio. Karibu na asante kwa kufanya biashara nasi.`;
}

/**
 * Template #2 – New debt added:
 * "MSAFIRI STORE: Habari [Jina], umeongezewa deni la TSh [Kiasi] kwa [Maelezo].
 *  Jumla ya deni lako sasa ni TSh [Jumla ya Deni]. Asante."
 */
export function buildDeniSMS(d: DeniSMSData): string {
  const duka = shopHeader(d.jinaDuka);
  const maelezo = d.maelezo?.trim() || d.bidhaa;
  return `${duka}: Habari ${d.jinaMteja}, umeongezewa deni la ${tsh(d.kiasi)} kwa ${maelezo}. Jumla ya deni lako sasa ni ${tsh(d.jumlaDeni)}. Asante.`;
}

/** Builds the manual debt reminder shown for review before it is sent. */
export function buildKumbushoSMS(d: KumbushoSMSData): string {
  const bidhaa = d.bidhaaZilizobaki.length > 0
    ? d.bidhaaZilizobaki.join(", ")
    : "Hakuna";

  return `${shopHeader(d.jinaDuka)}: Habari ${d.jinaMteja}, huu ni ukumbusho wa deni lako. Deni lililobaki: ${tsh(d.deniLililobaki)}. Yanayoendelea: ${d.yanayoendelea}. Bidhaa zilizobaki: ${bidhaa}. Tafadhali wasiliana nasi au fanya malipo. Asante.`;
}

/**
 * Payment SMS branches (logiki rasmi):
 *   - balance still remaining on this debt        → #3 Kupunguza Deni
 *   - this debt completed but others remain       → #4 Deni Moja Limekamilika
 *   - all debts at TSh 0                          → #5 Madeni Yote Yamekamilika
 * Only ONE SMS is ever sent per payment – when everything is 0, #5 wins.
 */
export function buildMalipoSMS(d: MalipoSMSData): string {
  const duka = shopHeader(d.jinaDuka);
  const lipa = tsh(d.malipoKiasi);

  if (d.bakaaBidhaa <= 0 && d.jumlaMadeniYote <= 0) {
    // #5 – all debts paid off
    return `${duka}: Habari ${d.jinaMteja}, tumepokea malipo yako ya mwisho ya ${lipa}. Madeni yako yote yamekamilika na kwa sasa huna deni lolote. Asante kwa kufanya malipo yako.`;
  }

  if (d.bakaaBidhaa <= 0) {
    // #4 – this debt completed, other debts remain
    return `${duka}: Habari ${d.jinaMteja}, deni la ${d.bidhaa} la ${tsh(d.kiasiDeni)} limekamilika. Hata hivyo, una madeni mengine yenye jumla ya ${tsh(d.jumlaMadeniYote)}. Asante kwa malipo yako.`;
  }

  // #3 – balance still remaining on this debt
  return `${duka}: Habari ${d.jinaMteja}, tumepokea malipo ya ${lipa}. Salio la deni lako sasa ni ${tsh(d.bakaaBidhaa)}. Jumla ya madeni yako yaliyobaki ni ${tsh(d.jumlaMadeniYote)}. Asante kwa malipo yako.`;
}

export interface DeniSMSData {
  jinaMteja: string;
  bidhaa: string;
  maelezo?: string;
  kiasi: number;
  jumlaDeni: number;
  jinaDuka: string;
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

/** Inserts a tenant-owned SMS log row for usage and delivery records. */
export async function logSMS(
  userId: number,
  namba: string,
  ujumbe: string,
  status: "success" | "failed" | "pending",
  response?: string,
  units = countSmsUnits(ujumbe)
) {
  try {
    return await prisma.smsLog.create({
      data: {
        mtumiajiId: userId,
        namba,
        ujumbe,
        status,
        vipande: units,
        beiMteja: status === "success" ? units * SMS_SELLING_PRICE : 0,
        gharamaMtoa: status === "success" ? units * SMS_PROVIDER_COST : 0,
        faida: status === "success" ? units * (SMS_SELLING_PRICE - SMS_PROVIDER_COST) : 0,
        response: response ? String(response).slice(0, 2000) : null,
      },
    });
  } catch {
    // logging must never break the payment flow
    return null;
  }
}

async function reserveSmsUnits(userId: number, units: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const reserved = await tx.user.updateMany({
      where: { id: userId, smsEnabled: true, smsBalance: { gte: units } },
      data: { smsBalance: { decrement: units } },
    });
    if (reserved.count !== 1) return false;

    const account = await tx.user.findUnique({
      where: { id: userId },
      select: { smsBalance: true },
    });
    await tx.smsTransaction.create({
      data: {
        mtumiajiId: userId,
        aina: "USAGE",
        vipande: -units,
        salioBaada: account?.smsBalance ?? 0,
        maelezo: `SMS ${units} imetengwa kwa kutumwa`,
      },
    });
    return true;
  });
}

async function refundSmsUnits(userId: number, units: number, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const account = await tx.user.update({
      where: { id: userId },
      data: { smsBalance: { increment: units } },
      select: { smsBalance: true },
    });
    await tx.smsTransaction.create({
      data: {
        mtumiajiId: userId,
        aina: "REFUND",
        vipande: units,
        salioBaada: account.smsBalance,
        maelezo: reason.slice(0, 255),
      },
    });
  });
}

/**
 * Sends an SMS using the Meseji API. Returns false (without throwing)
 * when SMS is disabled or fails, matching the original `@tumaSMS` behaviour.
 */
export async function tumaSMS(userId: number, namba: string, ujumbe: string): Promise<boolean> {
  const apiKey = process.env.MESEJI_API_KEY;
  const bearerToken = process.env.MESEJI_TOKEN;
  const units = countSmsUnits(ujumbe);

  if (!apiKey && !bearerToken) {
    await logSMS(userId, namba, ujumbe, "pending", "Huduma ya Meseji haijawekewa credentials.", units);
    return false;
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { smsEnabled: true, smsBalance: true },
  });
  if (!account?.smsEnabled) {
    await logSMS(userId, namba, ujumbe, "failed", "SMS zimezimwa kwenye akaunti.", units);
    return false;
  }
  if (account.smsBalance < units) {
    await logSMS(userId, namba, ujumbe, "failed", "Salio la SMS halitoshi.", units);
    return false;
  }

  const reserved = await reserveSmsUnits(userId, units);
  if (!reserved) {
    await logSMS(userId, namba, ujumbe, "failed", "Salio halitoshi au SMS zimezimwa.", units);
    return false;
  }

  const payload = {
    sender_id: process.env.MESEJI_SENDER || "MESEJI",
    message: ujumbe,
    contacts: normalizePhone(namba),
  };

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (apiKey) headers.set("x-api-key", apiKey);
  if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);

  try {
    const res = await fetch(MESEJI_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.text();
    const success = res.ok;
    await logSMS(userId, namba, ujumbe, success ? "success" : "failed", body, units);
    if (!success) {
      try {
        await refundSmsUnits(userId, units, `SMS haikutumwa na Meseji (${res.status}).`);
      } catch {
        // The delivery failure remains logged even if a database refund retry is needed.
      }
    }
    return success;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await logSMS(userId, namba, ujumbe, "failed", reason, units);
    try {
      await refundSmsUnits(userId, units, "SMS imeshindwa kutumwa; salio limerudishwa.");
    } catch {
      // Keep SMS best-effort; the failed delivery is already recorded above.
    }
    return false;
  }
}
