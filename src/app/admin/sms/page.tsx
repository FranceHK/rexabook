import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  SmsAdminView,
  type SmsAdminPurchase,
  type SmsAdminStats,
  type SmsAdminUser,
} from "@/components/admin/sms-admin-view";

export const metadata: Metadata = { title: "Admin SMS" };

export default async function SmsAdminPage() {
  const admin = await requireAdmin();

  const [users, purchases, paidTotals, pendingTotals, sentTotals] = await Promise.all([
    prisma.user.findMany({
      orderBy: { tareheKuundwa: "asc" },
      select: {
        id: true,
        jina: true,
        jina_duka: true,
        role: true,
        smsEnabled: true,
        smsBalance: true,
        smsLogs: {
          where: { status: "success" },
          select: { vipande: true },
        },
      },
    }),
    prisma.smsPurchase.findMany({
      include: { user: { select: { jina: true, jina_duka: true } } },
      orderBy: { tareheKuundwa: "desc" },
      take: 100,
    }),
    prisma.smsPurchase.aggregate({
      where: { status: "PAID" },
      _sum: { idadiSms: true, jumla: true, gharamaMtoa: true, faida: true },
    }),
    prisma.smsPurchase.aggregate({
      where: { status: "PENDING" },
      _count: { _all: true },
      _sum: { jumla: true },
    }),
    prisma.smsLog.aggregate({
      where: { status: "success" },
      _sum: { vipande: true },
    }),
  ]);

  const stats: SmsAdminStats = {
    users: users.length,
    soldUnits: paidTotals._sum.idadiSms ?? 0,
    sentUnits: sentTotals._sum.vipande ?? 0,
    sales: paidTotals._sum.jumla ?? 0,
    providerCost: paidTotals._sum.gharamaMtoa ?? 0,
    profit: paidTotals._sum.faida ?? 0,
    pendingOrders: pendingTotals._count._all,
    pendingValue: pendingTotals._sum.jumla ?? 0,
    userBalanceTotal: users.reduce((sum, user) => sum + user.smsBalance, 0),
  };

  const purchaseRows: SmsAdminPurchase[] = purchases
    .sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"))
    .map((purchase) => ({
      id: purchase.id,
      userName: purchase.user.jina,
      shopName: purchase.user.jina_duka,
      units: purchase.idadiSms,
      total: purchase.jumla,
      providerCost: purchase.gharamaMtoa,
      profit: purchase.faida,
      reference: purchase.kumbukumbu,
      paymentProvider: purchase.paymentProvider,
      status: purchase.status,
      createdAt: purchase.tareheKuundwa.toISOString(),
    }));

  const userRows: SmsAdminUser[] = users.map((user) => ({
    id: user.id,
    name: user.jina,
    shopName: user.jina_duka,
    role: user.role,
    smsEnabled: user.smsEnabled,
    smsBalance: user.smsBalance,
    sentUnits: user.smsLogs.reduce((sum, log) => sum + log.vipande, 0),
    isCurrent: user.id === admin.id,
  }));

  return (
    <AppShell user={{ jina: admin.jina, jinaDuka: admin.jina_duka, isAdmin: true }}>
      <SmsAdminView
        stats={stats}
        purchases={purchaseRows}
        users={userRows}
        providerConfigured={Boolean(process.env.MESEJI_API_KEY || process.env.MESEJI_TOKEN)}
      />
    </AppShell>
  );
}
