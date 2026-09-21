const MESEJI_STATS_URL = "https://meseji.co.tz/api/v1/sms/user-stats";

export interface MesejiAccountStats {
  username: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: string;
  balance: number;
  rate: number;
}

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getMesejiAccountStats(): Promise<MesejiAccountStats | null> {
  const apiKey = process.env.MESEJI_API_KEY;
  const bearerToken = process.env.MESEJI_TOKEN;
  if (!apiKey && !bearerToken) return null;

  const headers = new Headers();
  if (apiKey) headers.set("x-api-key", apiKey);
  if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);

  try {
    const response = await fetch(MESEJI_STATS_URL, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;

    const payload = await response.json() as {
      user?: { username?: unknown };
      summary?: Record<string, unknown>;
    };
    const summary = payload.summary;
    if (!summary) return null;

    return {
      username: String(payload.user?.username ?? "Meseji"),
      totalSent: finiteNumber(summary.total_sent),
      totalDelivered: finiteNumber(summary.total_delivered),
      totalFailed: finiteNumber(summary.total_failed),
      successRate: String(summary.success_rate ?? "0%"),
      balance: finiteNumber(summary.balance),
      rate: finiteNumber(summary.rate),
    };
  } catch {
    return null;
  }
}
