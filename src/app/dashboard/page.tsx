import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toMoney, fmtPesa, fmtTarehe, fmtTareheRefu, bakaa as bakaaOf, pctPaid } from "@/lib/format";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { PaymentsChart, type ChartPoint } from "@/components/dashboard/payments-chart";
import { Users, Wallet, CheckCircle2, Hourglass, Plus, Search, Files, LayoutList } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashibodi" };

export default async function DashboardPage() {
  const user = await requireUser();

  const watejaCount = await prisma.customer.count({ where: { mtumiajiId: user.id } });

  const madeni = await prisma.debt.findMany({
    where: { mtumiajiId: user.id },
    select: { id: true, kiasiAsili: true, kiasiKilicholipwa: true, imekamilika: true, tareheKukopa: true, jinaBidhaa: true, mtejaId: true, customer: { select: { jina: true, id: true } } },
  });

  const jumlaMadeni = madeni.reduce((s, d) => s + toMoney(d.kiasiAsili), 0);
  const jumlaLipwa = madeni.reduce((s, d) => s + toMoney(d.kiasiKilicholipwa), 0);
  const jumlaBakaa = madeni.reduce((s, d) => s + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);
  const madaiwaYanayoendelea = madeni.filter((d) => !d.imekamilika).length;

  const madeniKaribuni = [...madeni]
    .sort((a, b) => b.tareheKukopa.getTime() - a.tareheKukopa.getTime())
    .slice(0, 10);

  const malipoKaribuni = await prisma.payment.findMany({
    where: { debt: { mtumiajiId: user.id } },
    include: { debt: { select: { customer: { select: { jina: true } }, jinaBidhaa: true } } },
    orderBy: { tarehe: "desc" },
    take: 6,
  });

  // Last 7 days of payments for the chart
  const now = new Date();
  const chartData: ChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayStart = d;
    const sum = await prisma.payment.aggregate({
      where: { debt: { mtumiajiId: user.id }, tarehe: { gte: dayStart, lt: next } },
      _sum: { kiasi: true },
    });
    chartData.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: toMoney(sum._sum.kiasi),
    });
  }

  const activeCargo = await prisma.cargo.count({
    where: { mtumiajiId: user.id, hali: "Haijafika" },
  });

  const today = fmtTareheRefu(new Date());

  const stats = [
    { label: "Wateja wote", value: watejaCount.toLocaleString("en-TZ"), sub: "Jumla ya wadaiwa", icon: Users, tone: "blue" },
    { label: "Jumla ya Madeni", value: fmtPesa(jumlaMadeni), sub: "Kiasi chote", icon: Wallet, tone: "red" },
    { label: "Malipo Yote", value: fmtPesa(jumlaLipwa), sub: "Imelipwa", icon: CheckCircle2, tone: "green" },
    { label: "Bado Inadaiwa", value: fmtPesa(jumlaBakaa), sub: `${madaiwaYanayoendelea} deni linaloendelea`, icon: Hourglass, tone: "orange" },
  ];

  const quickActions = [
    { label: "Wadaiwa", href: "/customers", icon: Users },
    { label: "Mdaiwa Mpya", href: "/customers?new=1", icon: Plus },
    { label: "Mizigo", href: "/cargo", icon: Search },
    { label: "Ripoti PDF", href: "/customers", icon: Files },
  ];

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: user.jina_duka }}>
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Karibu, <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">{user.jina}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-ink-3">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers?new=1" className="btn btn-primary">
            <Plus className="size-4" /> Mdaiwa Mpya
          </Link>
          <Link href="/cargo?new=1" className="btn btn-secondary">
            <Plus className="size-4" /> Mzigo Mpya
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className="panel group relative overflow-hidden p-5 transition hover:-translate-y-0.5">
            <div className={`absolute inset-x-0 top-0 h-1 ${toneStyles(tone)} rounded-t-2xl`} aria-hidden />
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl neu-inset" style={{ color: `var(${toneVar(tone)})` }}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="truncate text-xl font-semibold text-ink">{value}</p>
                <p className="text-xs text-ink-2">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent debts */}
        <Card className="lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><LayoutList className="size-4 text-primary" /> Madeni ya Hivi Karibuni</span>} action={<Link href="/customers" className="text-sm font-medium text-primary hover:underline">Ona Yote →</Link>} />
          <CardBody className="p-0">
            {madeniKaribuni.length === 0 ? (
              <EmptyState text="Hakuna madeni yaliyoandikwa bado." href="/customers?new=1" cta="Ongeza Mdaiwa wa Kwanza" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                      <th className="px-5 py-3 font-medium">Mteja</th>
                      <th className="px-5 py-3 font-medium">Bidhaa</th>
                      <th className="px-5 py-3 font-medium">Kiasi</th>
                      <th className="px-5 py-3 font-medium">Maendeleo</th>
                      <th className="px-5 py-3 font-medium">Hali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {madeniKaribuni.map((d) => (
                      <tr key={d.id} className="border-b border-line/60 transition hover:bg-surface-2">
                        <td className="px-5 py-3.5">
                          <Link href={`/customers/${d.mtejaId}`} className="font-medium text-primary hover:underline">
                            {d.customer?.jina ?? "—"}
                          </Link>
                        </td>
                        <td className="max-w-[140px] truncate px-5 py-3.5 text-ink-2">{d.jinaBidhaa}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink">{fmtPesa(d.kiasiAsili)}</td>
                        <td className="px-5 py-3.5">
                          <div className="w-32">
                            <ProgressBar pct={pctPaid(d.kiasiAsili, d.kiasiKilicholipwa)} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {d.imekamilika ? <Badge tone="done">Imelipwa</Badge> : <Badge tone="wait">Inadaiwa</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Plus className="size-4 text-primary" /> Vitendo vya Haraka</span>} />
            <CardBody className="grid grid-cols-2 gap-3">
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} className="flex flex-col items-center gap-2 rounded-2xl neu p-4 text-sm font-medium text-ink-2 transition hover:text-primary">
                  <span className="grid size-10 place-items-center rounded-xl text-primary" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <Icon className="size-5" />
                  </span>
                  {label}
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Wallet className="size-4 text-primary" /> Malipo ya Hivi Karibuni</span>} />
            <CardBody className="p-0">
              {malipoKaribuni.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-3">Hakuna malipo bado</p>
              ) : (
                <div className="divide-y divide-line/60">
                  {malipoKaribuni.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full neu-inset text-sm font-bold text-primary">
                        {(m.debt?.customer?.jina ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{m.debt?.customer?.jina}</p>
                        <p className="truncate text-xs text-ink-3">{m.debt?.jinaBidhaa} · {fmtTarehe(m.tarehe)}</p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-success">+{fmtPesa(m.kiasi)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Malipo kwa Kila Siku</span>} />
            <CardBody>
              <PaymentsChart data={chartData} />
              <p className="mt-3 text-center text-xs text-ink-3">
                Siku 7 zilizopita · {activeCargo} mzigo haujafika
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function toneStyles(tone: string): string {
  return (
    {
      blue: "bg-[var(--primary)]",
      red: "bg-[var(--danger)]",
      green: "bg-[var(--success)]",
      orange: "bg-[var(--warning)]",
    } as Record<string, string>
  )[tone] ?? "bg-[var(--primary)]";
}

function toneVar(tone: string): string {
  return (
    { blue: "--primary", red: "--danger", green: "--success", orange: "--warning" } as Record<string, string>
  )[tone] ?? "--primary";
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="grid size-16 place-items-center rounded-full neu-inset text-ink-3">
        <Search className="size-7" />
      </div>
      <p className="text-sm text-ink-2">{text}</p>
      <Link href={href} className="btn btn-primary">{cta}</Link>
    </div>
  );
}