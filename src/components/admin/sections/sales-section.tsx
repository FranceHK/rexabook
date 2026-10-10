import { prisma } from "@/lib/db";
import { subscriptionIsActive } from "@/lib/auth";
import { SALES_COMMISSION_PERCENT, SUBSCRIPTION_PLANS } from "@/lib/plans";
import { SalesAdminView, type SalesAdminRow } from "@/components/admin/sales-admin-view";

export async function AdminSalesSection() {
  const salesPeople = await prisma.user.findMany({
    where: { role: "SALES" },
    select: {
      id: true,
      jina: true,
      simu: true,
      referralCode: true,
      isActive: true,
      jinaKamili: true,
      email: true,
      mkoa: true,
      tempPassword: true,
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
      fullName: sales.jinaKamili,
      email: sales.email,
      region: sales.mkoa,
      starterPassword: sales.tempPassword,
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

  return <SalesAdminView rows={rows} commissionPercent={SALES_COMMISSION_PERCENT} />;
}
