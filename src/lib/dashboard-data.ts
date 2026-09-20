import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { toMoney } from "@/lib/format";
import { DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";

export const getDashboardData = unstable_cache(
  async (userId: number) => {
    const now = new Date();
    const chartStart = new Date(now);
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - 6);

    const [user, watejaCount, debts, recentPayments, chartPaymentRows, cargoRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, jina: true, jina_duka: true },
      }),
      prisma.customer.count({ where: { mtumiajiId: userId } }),
      prisma.debt.findMany({
        where: { mtumiajiId: userId },
        select: {
          id: true,
          kiasiAsili: true,
          kiasiKilicholipwa: true,
          imekamilika: true,
          tareheKukopa: true,
          jinaBidhaa: true,
          mtejaId: true,
          customer: { select: { jina: true, id: true } },
        },
      }),
      prisma.payment.findMany({
        where: { debt: { mtumiajiId: userId } },
        select: {
          id: true,
          kiasi: true,
          tarehe: true,
          debt: { select: { customer: { select: { jina: true } }, jinaBidhaa: true } },
        },
        orderBy: { tarehe: "desc" },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { debt: { mtumiajiId: userId }, tarehe: { gte: chartStart } },
        select: { kiasi: true, tarehe: true },
      }),
      prisma.cargo.findMany({
        where: { mtumiajiId: userId },
        select: {
          id: true,
          jinaKampuni: true,
          jumlaGharama: true,
          hali: true,
          tareheKuagiza: true,
          items: { select: { id: true, imefika: true } },
        },
        orderBy: { tareheKuagiza: "desc" },
      }),
    ]);

    if (!user) return null;

    return {
      user,
      watejaCount,
      madeni: debts.map((debt) => ({
        ...debt,
        kiasiAsili: toMoney(debt.kiasiAsili),
        kiasiKilicholipwa: toMoney(debt.kiasiKilicholipwa),
        tareheKukopa: debt.tareheKukopa.toISOString(),
      })),
      malipoKaribuni: recentPayments.map((payment) => ({
        ...payment,
        kiasi: toMoney(payment.kiasi),
        tarehe: payment.tarehe.toISOString(),
      })),
      chartPayments: chartPaymentRows.map((payment) => ({
        kiasi: toMoney(payment.kiasi),
        tarehe: payment.tarehe.toISOString(),
      })),
      cargos: cargoRows.map((cargo) => ({
        ...cargo,
        jumlaGharama: toMoney(cargo.jumlaGharama),
        tareheKuagiza: cargo.tareheKuagiza.toISOString(),
      })),
    };
  },
  ["dashboard-data-v1"],
  { revalidate: 30, tags: [DASHBOARD_CACHE_TAG] }
);
