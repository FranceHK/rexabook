import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin, subscriptionIsActive } from "@/lib/auth";
import { SALES_COMMISSION_PERCENT, SUBSCRIPTION_PLANS } from "@/lib/plans";
import { AppShell } from "@/components/layout/app-shell";
import { SalesAdminView, type SalesAdminRow } from "@/components/admin/sales-admin-view";

export const metadata: Metadata = { title: "Admin Sales" };
export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const admin = await requireAdmin();
  const salesPeople = await prisma.user.findMany({
    where: { role: "SALES" },
    select: {
      id: true,
      jina: true,
      simu: true,
      referralCode: true,
      isActive: true,
      mustChangePassword: true,
      referrals: {
        select: { id: true, jina: true, jina_duka: true, role: true, subscriptionStatus: true, subscriptionEndsAt: true, subscriptionPlan: true, tareheKuundwa: true },
        orderBy: { tareheKuundwa: "desc" },
      },
      earnedCommissions: { select: { customerUserId: true, kiasiMalipo: true, kiasi: true, tareheKulipwa: true } },
    },
    orderBy: { tareheKuundwa: "desc" },
  });

  const rows: SalesAdminRow[] = salesPeople.map((sales) => {
    const perCustomer = new Map<number, { paid: number; commission: number }>();
    for (const commission of sales.earnedCommissions) {
      const totals = perCustomer.get(commission.customerUserId) ?? { paid: 0, commission: 0 };
      totals.paid += commission.kiasiMalipo;
      totals.commission += commission.kiasi;
      perCustomer.set(commission.customerUserId, totals);
    }
    return {
      id: sales.id,
      name: sales.jina,
      phone: sales.simu,
      code: sales.referralCode ?? "-",
      active: sales.isActive,
      mustChangePassword: sales.mustChangePassword,
      payingCustomers: perCustomer.size,
      earned: sales.earnedCommissions.reduce((sum, commission) => sum + commission.kiasi, 0),
      unpaid: sales.earnedCommissions.filter((commission) => !commission.tareheKulipwa).reduce((sum, commission) => sum + commission.kiasi, 0),
      customers: sales.referrals.map((customer) => {
        const active = subscriptionIsActive(customer);
        return {
          id: customer.id,
          shop: customer.jina_duka,
          username: customer.jina,
          joinedAt: customer.tareheKuundwa.toISOString(),
          active,
          status: !active ? "Imeisha" : customer.subscriptionStatus === "TRIAL" ? "Majaribio" : SUBSCRIPTION_PLANS[customer.subscriptionPlan].label,
          paid: perCustomer.get(customer.id)?.paid ?? 0,
          commission: perCustomer.get(customer.id)?.commission ?? 0,
        };
      }),
    };
  });

  return (
    <AppShell user={{ jina: admin.jina, jinaDuka: admin.jina_duka, isAdmin: true, businessRole: admin.businessRole }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Admin Sales</h1>
        <p className="mt-1 text-sm text-ink-3">Sales persons wanaotafuta wateja wa RexaBook, wateja wao na commission zao.</p>
      </header>
      <SalesAdminView rows={rows} commissionPercent={SALES_COMMISSION_PERCENT} />
    </AppShell>
  );
}
