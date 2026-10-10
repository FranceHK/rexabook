import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleDollarSign, Clock3, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSales, salesProfileComplete, subscriptionIsActive } from "@/lib/auth";
import { SALES_COMMISSION_PERCENT, SUBSCRIPTION_PLANS } from "@/lib/plans";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Wateja Wangu" };
export const dynamic = "force-dynamic";

const money = (value: number) => `TZS ${value.toLocaleString("en-TZ")}`;
const date = (value: Date) => value.toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

export default async function SalesPage() {
  const sales = await requireSales();
  if (!salesProfileComplete(sales)) redirect("/sales/settings");
  const [customers, commissions] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: sales.id },
      select: { id: true, jina: true, jina_duka: true, role: true, subscriptionStatus: true, subscriptionEndsAt: true, subscriptionPlan: true, tareheKuundwa: true },
      orderBy: { tareheKuundwa: "desc" },
    }),
    prisma.salesCommission.findMany({
      where: { salesUserId: sales.id },
      include: { customer: { select: { jina_duka: true } }, payment: { select: { plan: true } } },
      orderBy: { tarehe: "desc" },
    }),
  ]);

  const perCustomer = new Map<number, { paid: number; commission: number; payments: number }>();
  for (const commission of commissions) {
    const row = perCustomer.get(commission.customerUserId) ?? { paid: 0, commission: 0, payments: 0 };
    row.paid += commission.kiasiMalipo;
    row.commission += commission.kiasi;
    row.payments += 1;
    perCustomer.set(commission.customerUserId, row);
  }
  const earned = commissions.reduce((sum, commission) => sum + commission.kiasi, 0);
  const unpaid = commissions.filter((commission) => !commission.tareheKulipwa).reduce((sum, commission) => sum + commission.kiasi, 0);

  return (
    <AppShell user={{ jina: sales.jina, jinaDuka: sales.jina_duka, isSales: true }}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Wateja Wangu</h1>
          <p className="mt-1 text-sm text-ink-3">Unapata {SALES_COMMISSION_PERCENT}% kila mteja wako anapolipia subscription.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-4 py-3 text-right shadow-card">
          <p className="text-xs font-medium uppercase text-ink-3">Referral code yako</p>
          <p className="mt-1 text-xl font-semibold tracking-widest text-primary">{sales.referralCode ?? "-"}</p>
          <p className="mt-1 text-xs text-ink-3">Mteja aiandike anapofungua akaunti.</p>
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Wateja niliowaunganisha", customers.length.toLocaleString("en-TZ"), Users, "text-primary bg-primary/10"],
          ["Commission jumla", money(earned), CircleDollarSign, "text-success bg-success/10"],
          ["Bado sijalipwa", money(unpaid), Clock3, "text-warning bg-warning/10"],
          ["Nimeshalipwa", money(earned - unpaid), Wallet, "text-info bg-info/10"],
        ] as const).map(([label, value, Icon, tone]) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-card">
            <div>
              <p className="text-xs font-medium uppercase text-ink-3">{label}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
            </div>
            <span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Wateja na Commission" action={<span className="badge badge-info">{customers.length}</span>} />
          <CardBody className="!p-0">
            {customers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-3">Bado hujaunganisha mteja. Mpe mteja referral code yako.</p>
            ) : (
              <div className="divide-y divide-line">
                {customers.map((customer) => {
                  const totals = perCustomer.get(customer.id) ?? { paid: 0, commission: 0, payments: 0 };
                  const active = subscriptionIsActive(customer);
                  const status = !active ? "Imeisha" : customer.subscriptionStatus === "TRIAL" ? "Majaribio" : SUBSCRIPTION_PLANS[customer.subscriptionPlan].label;
                  return (
                    <div key={customer.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{customer.jina_duka}</p>
                        <p className="text-xs text-ink-3">{customer.jina} · Alijiunga {date(customer.tareheKuundwa)}</p>
                        <p className="text-xs text-ink-3">Amelipa {money(totals.paid)} · mara {totals.payments}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">{money(totals.commission)}</p>
                        <span className={`badge ${active ? "badge-done" : "badge-danger"}`}>{status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Historia ya Commission" />
          <CardBody className="!p-0">
            {commissions.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna commission bado.</p>
            ) : (
              <div className="divide-y divide-line">
                {commissions.slice(0, 100).map((commission) => (
                  <div key={commission.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{commission.customer.jina_duka}</p>
                      <p className="text-xs text-ink-3">{SUBSCRIPTION_PLANS[commission.payment.plan].label} · {money(commission.kiasiMalipo)} · {date(commission.tarehe)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">{money(commission.kiasi)}</p>
                      <span className={`badge ${commission.tareheKulipwa ? "badge-done" : "badge-wait"}`}>{commission.tareheKulipwa ? "Umelipwa" : "Inasubiri"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
