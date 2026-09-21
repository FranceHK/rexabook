import type { Metadata } from "next";
import { CreditCard, CircleDollarSign, Clock3, Store, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin, subscriptionIsActive } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Subscription" };
const money = (value: number) => `TZS ${value.toLocaleString("en-TZ")}`;

export default async function AdminSubscriptionsPage() {
  const admin = await requireAdmin();
  const [owners, payments] = await Promise.all([
    prisma.user.findMany({
      where: { ownerId: null },
      select: { id: true, jina: true, jina_duka: true, subscriptionStatus: true, subscriptionEndsAt: true, tareheKuundwa: true },
      orderBy: { tareheKuundwa: "desc" },
    }),
    prisma.subscriptionPayment.findMany({
      include: { user: { select: { jina: true, jina_duka: true } } },
      orderBy: { tareheKuundwa: "desc" },
      take: 100,
    }),
  ]);
  const activeOwners = owners.filter(subscriptionIsActive);
  const paid = payments.filter((payment) => payment.status === "ACTIVE");
  const collected = paid.reduce((sum, payment) => sum + payment.kiasi, 0);
  const pending = payments.filter((payment) => payment.status === "PENDING");

  return (
    <AppShell user={{ jina: admin.jina, jinaDuka: admin.jina_duka, isAdmin: true, businessRole: admin.businessRole }}>
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-success/10 text-success"><CreditCard className="size-5" /></span>
        <div><h1 className="text-2xl font-semibold text-ink">Admin Subscription</h1><p className="mt-1 text-sm text-ink-3">Mapato ya RexaBook na hali za biashara zote.</p></div>
      </header>
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Biashara zote", owners.length.toLocaleString("en-TZ"), Store, "text-primary bg-primary/10"],
          ["Zinazofanya kazi", activeOwners.length.toLocaleString("en-TZ"), TrendingUp, "text-success bg-success/10"],
          ["Mapato yaliyokusanywa", money(collected), CircleDollarSign, "text-info bg-info/10"],
          ["Malipo yanayosubiri", pending.length.toLocaleString("en-TZ"), Clock3, "text-warning bg-warning/10"],
        ].map(([label, value, Icon, tone]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-card"><div><p className="text-xs font-medium uppercase text-ink-3">{label as string}</p><p className="mt-2 text-xl font-semibold text-ink">{value as string}</p></div><span className={`grid size-10 place-items-center rounded-lg ${tone as string}`}><Icon className="size-5" /></span></div>)}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader title="Biashara na Hali" /><CardBody className="!p-0"><div className="divide-y divide-line">{owners.map((owner) => { const active = subscriptionIsActive(owner); return <div key={owner.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-ink">{owner.jina_duka}</p><p className="text-xs text-ink-3">{owner.jina} · {owner.subscriptionEndsAt?.toLocaleDateString("sw-TZ") || "Hakuna tarehe"}</p></div><span className={`badge ${active ? "badge-done" : "badge-danger"}`}>{active ? owner.subscriptionStatus : "EXPIRED"}</span></div>; })}</div></CardBody></Card>
        <Card><CardHeader title="Malipo ya Karibuni" /><CardBody className="!p-0">{payments.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna malipo bado.</p> : <div className="divide-y divide-line">{payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-ink">{payment.user.jina_duka}</p><p className="text-xs text-ink-3">{payment.miezi} mwezi · {payment.tareheKuundwa.toLocaleDateString("sw-TZ")}</p></div><div className="text-right"><p className="font-semibold text-ink">{money(payment.kiasi)}</p><span className={`badge ${payment.status === "ACTIVE" ? "badge-done" : payment.status === "PENDING" ? "badge-wait" : "badge-danger"}`}>{payment.status}</span></div></div>)}</div>}</CardBody></Card>
      </div>
    </AppShell>
  );
}
