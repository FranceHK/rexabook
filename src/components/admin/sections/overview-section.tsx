import Link from "next/link";
import { ArrowRight, CircleDollarSign, Clock3, Handshake, MessageSquareText, Store, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { subscriptionIsActive } from "@/lib/auth";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const money = (value: number) => `TZS ${value.toLocaleString("en-TZ")}`;
const count = (value: number) => value.toLocaleString("en-TZ");

function Tile({ label, value, note, icon: Icon, tone }: { label: string; value: string; note?: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-ink-3">{label}</p>
        <p className="mt-2 truncate text-xl font-semibold text-ink">{value}</p>
        {note ? <p className="mt-1 text-xs text-ink-3">{note}</p> : null}
      </div>
      <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></span>
    </div>
  );
}

export async function AdminOverviewSection() {
  const [owners, subscriptionPaid, subscriptionPending, recentPayments, salesPeople, commission, smsPaid, smsPending] = await Promise.all([
    prisma.user.findMany({
      where: { ownerId: null, role: { not: "SALES" } },
      select: { role: true, subscriptionStatus: true, subscriptionEndsAt: true },
    }),
    prisma.subscriptionPayment.aggregate({ where: { status: "ACTIVE" }, _sum: { kiasi: true }, _count: { _all: true } }),
    prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
    prisma.subscriptionPayment.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { jina_duka: true } } },
      orderBy: { tareheKuundwa: "desc" },
      take: 6,
    }),
    prisma.user.count({ where: { role: "SALES" } }),
    prisma.salesCommission.aggregate({ where: { tareheKulipwa: null }, _sum: { kiasi: true } }),
    prisma.smsPurchase.aggregate({ where: { status: "PAID" }, _sum: { jumla: true, faida: true } }),
    prisma.smsPurchase.count({ where: { status: "PENDING" } }),
  ]);

  const businesses = owners.filter((owner) => owner.role !== "ADMIN");
  const active = businesses.filter(subscriptionIsActive).length;
  const unpaidCommission = commission._sum.kiasi ?? 0;
  const todo = [
    { show: smsPending > 0, text: `Oda ${count(smsPending)} za SMS zinasubiri kuthibitishwa`, href: "/admin?tab=sms" },
    { show: unpaidCommission > 0, text: `Sales wanadai commission ya ${money(unpaidCommission)}`, href: "/admin?tab=sales" },
    { show: subscriptionPending > 0, text: `Malipo ${count(subscriptionPending)} ya subscription bado yanasubiri`, href: "/admin?tab=malipo" },
  ].filter((item) => item.show);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Biashara" value={count(businesses.length)} note={`Zinazofanya kazi ${count(active)}`} icon={Store} tone="bg-primary/10 text-primary" />
        <Tile label="Mapato ya subscription" value={money(subscriptionPaid._sum.kiasi ?? 0)} note={`Malipo ${count(subscriptionPaid._count._all)}`} icon={CircleDollarSign} tone="bg-success/10 text-success" />
        <Tile label="Mauzo ya SMS" value={money(smsPaid._sum.jumla ?? 0)} note={`Faida ${money(smsPaid._sum.faida ?? 0)}`} icon={MessageSquareText} tone="bg-primary-2/10 text-primary-2" />
        <Tile label="Sales persons" value={count(salesPeople)} note={`Wanadai ${money(unpaidCommission)}`} icon={Handshake} tone="bg-info/10 text-info" />
        <Tile label="Zilizoisha muda" value={count(businesses.length - active)} note="Biashara zisizolipia" icon={TrendingUp} tone={businesses.length - active ? "bg-danger/10 text-danger" : "bg-success/10 text-success"} />
        <Tile label="Malipo yanayosubiri" value={count(subscriptionPending)} note="Ya subscription" icon={Clock3} tone="bg-warning/10 text-warning" />
        <Tile label="Oda za SMS zinazosubiri" value={count(smsPending)} icon={Clock3} tone="bg-warning/10 text-warning" />
        <Tile label="Commission inayodaiwa" value={money(unpaidCommission)} icon={Wallet} tone={unpaidCommission ? "bg-danger/10 text-danger" : "bg-success/10 text-success"} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Yanayohitaji hatua yako" action={<span className="badge badge-info">{todo.length}</span>} />
          <CardBody className="!p-0">
            {todo.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna kinachosubiri. Kila kitu kiko sawa.</p>
            ) : (
              <div className="divide-y divide-line">
                {todo.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm text-ink-2 transition hover:bg-surface-2 hover:text-primary">
                    {item.text} <ArrowRight className="size-4 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Malipo ya karibuni ya subscription" />
          <CardBody className="!p-0">
            {recentPayments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna malipo bado.</p>
            ) : (
              <div className="divide-y divide-line">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{payment.user.jina_duka}</p>
                      <p className="text-xs text-ink-3">{SUBSCRIPTION_PLANS[payment.plan].label} · {payment.tareheKuundwa.toLocaleDateString("sw-TZ")}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-ink">{money(payment.kiasi)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
