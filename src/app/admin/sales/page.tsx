import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SALES_COMMISSION_PERCENT } from "@/lib/plans";
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
      referrals: { select: { id: true } },
      earnedCommissions: { select: { customerUserId: true, kiasi: true, tareheKulipwa: true } },
    },
    orderBy: { tareheKuundwa: "desc" },
  });

  const rows: SalesAdminRow[] = salesPeople.map((sales) => ({
    id: sales.id,
    name: sales.jina,
    phone: sales.simu,
    code: sales.referralCode ?? "-",
    active: sales.isActive,
    customers: sales.referrals.length,
    payingCustomers: new Set(sales.earnedCommissions.map((commission) => commission.customerUserId)).size,
    earned: sales.earnedCommissions.reduce((sum, commission) => sum + commission.kiasi, 0),
    unpaid: sales.earnedCommissions.filter((commission) => !commission.tareheKulipwa).reduce((sum, commission) => sum + commission.kiasi, 0),
  }));

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
