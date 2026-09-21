import { createHmac, timingSafeEqual } from "node:crypto";

const SNIPPE_BASE_URL = "https://api.snippe.sh";
const REQUEST_TIMEOUT_MS = 30_000;

export type SnippePaymentStatus = "pending" | "completed" | "failed" | "voided" | "expired";

export interface SnippePayment {
  reference: string;
  status: SnippePaymentStatus;
  amount: { value: number; currency: string };
  expires_at?: string;
}

interface SnippeResponse<T> {
  status?: string;
  code?: number;
  data?: T;
  message?: string;
  error_code?: string;
}

function apiKey(): string {
  const key = process.env.SNIPPE_API_KEY?.trim();
  if (!key) throw new Error("SNIPPE_NOT_CONFIGURED");
  return key;
}

function webhookUrl(): string | undefined {
  const explicit = process.env.SNIPPE_WEBHOOK_URL?.trim();
  const base = explicit || process.env.NEXTAUTH_URL?.trim();
  if (!base) return undefined;
  const url = explicit || `${base.replace(/\/$/, "")}/api/webhooks/snippe`;
  return url.startsWith("https://") ? url : undefined;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: SnippeResponse<T> | null = null;
  try {
    payload = JSON.parse(raw) as SnippeResponse<T>;
  } catch {
    // A safe generic message is returned below; never expose upstream HTML.
  }

  if (!response.ok || !payload?.data) {
    const message = payload?.message?.slice(0, 180) || `Snippe imerudisha hitilafu (${response.status}).`;
    throw new Error(`SNIPPE_API_ERROR:${message}`);
  }
  return payload.data;
}

export async function createSnippePayment(input: {
  purchaseId: number;
  userId: number;
  units: number;
  amount: number;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<SnippePayment> {
  const callback = webhookUrl();
  const body = {
    payment_type: "mobile",
    details: { amount: input.amount, currency: "TZS" },
    phone_number: input.phone,
    customer: {
      firstname: input.firstName,
      lastname: input.lastName,
      email: input.email,
    },
    ...(callback ? { webhook_url: callback } : {}),
    metadata: {
      order_id: `SMS-${input.purchaseId}`,
      purchase_id: String(input.purchaseId),
      user_id: String(input.userId),
      sms_units: String(input.units),
    },
  };

  const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `sms-${input.purchaseId}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  return parseResponse<SnippePayment>(response);
}

export async function getSnippePayment(reference: string): Promise<SnippePayment> {
  const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  return parseResponse<SnippePayment>(response);
}

export function verifySnippeWebhook(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SNIPPE_WEBHOOK_SECRET?.trim();
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const eventTime = Number(timestamp);
  if (!Number.isSafeInteger(eventTime) || Math.abs(Math.floor(Date.now() / 1000) - eventTime) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
