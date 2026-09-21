import { redirect } from "next/navigation";
import { businessIdFor, requireActiveBusinessUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { toMoney, fmtPesa, fmtTarehe, fmtTareheRefu, bakaa as bakaaOf, pctPaid, initial } from "@/lib/format";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { PaymentsChart, type ChartPoint } from "@/components/dashboard/payments-chart";
import {
  Users,
  Wallet,
  CheckCircle2,
  Hourglass,
  Plus,
  Search,
  Files,
  LayoutList,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  HandCoins,
  PackagePlus,
  ReceiptText,
  Package,
  Truck,
  Boxes,
  Factory,
  CalendarClock,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashibodi" };

const DELAY = ["0ms", "60ms", "120ms", "180ms"];

export default async function DashboardPage() {
  const sessionUser = await requireActiveBusinessUser();
  const userId = businessIdFor(sessionUser);

  const dashboardData = await getDashboardData(userId);
  if (!dashboardData) redirect("/login");
  const { user, watejaCount, madeni, malipoKaribuni, chartPayments, cargos } = dashboardData;

  const now = new Date();

  const jumlaMadeni = madeni.reduce((s, d) => s + toMoney(d.kiasiAsili), 0);
  const jumlaLipwa = madeni.reduce((s, d) => s + toMoney(d.kiasiKilicholipwa), 0);
  const jumlaBakaa = madeni.reduce((s, d) => s + bakaaOf(d.kiasiAsili, d.kiasiKilicholipwa), 0);
  const madaiwaYanayoendelea = madeni.filter((d) => !d.imekamilika).length;
  const paidPct = jumlaMadeni > 0 ? Math.round((jumlaLipwa / jumlaMadeni) * 100) : 0;

  const madeniKaribuni = [...madeni]
    .sort((a, b) => new Date(b.tareheKukopa).getTime() - new Date(a.tareheKukopa).getTime())
    .slice(0, 8);

  // Last 7 days of payments for the chart, grouped after one database read.
  const chartData: ChartPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    chartData.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: chartPayments
        .filter((payment) => {
          const paymentDate = new Date(payment.tarehe);
          return paymentDate >= d && paymentDate < next;
        })
        .reduce((sum, payment) => sum + toMoney(payment.kiasi), 0),
    });
  }

  const activeCargo = cargos.filter((cargo) => cargo.hali === "Haijafika").length;
  const arrivedCargo = cargos.length - activeCargo;
  const totalCargoValue = cargos.reduce((sum, cargo) => sum + toMoney(cargo.jumlaGharama), 0);
  const cargoItemsCount = cargos.reduce((sum, cargo) => sum + cargo.items.length, 0);
  const arrivedCargoItems = cargos.reduce(
    (sum, cargo) => sum + cargo.items.filter((item) => item.imefika || cargo.hali === "Imefika").length,
    0
  );
  const cargoProgress = cargoItemsCount > 0 ? Math.round((arrivedCargoItems / cargoItemsCount) * 100) : 0;
  const recentCargo = cargos.slice(0, 4);

  const today = fmtTareheRefu(new Date());
  const firstName = user.jina.split("@")[0].split(".")[0] || user.jina;

  const stats = [
    { label: "Wateja wote", value: watejaCount.toLocaleString("en-TZ"), sub: "Jumla ya wadaiwa", icon: Users, tone: "blue" },
    { label: "Jumla ya Madeni", value: fmtPesa(jumlaMadeni), sub: "Kiasi chote kimekopeshwa", icon: Wallet, tone: "purple" },
    { label: "Imelipwa", value: fmtPesa(jumlaLipwa), sub: `${paidPct}% imekamilika`, icon: CheckCircle2, tone: "green" },
    { label: "Imebaki", value: fmtPesa(jumlaBakaa), sub: `${madaiwaYanayoendelea} deni linaloendelea`, icon: Hourglass, tone: "orange" },
  ];

  const quickActions = [
    { label: "Wadaiwa", href: "/customers", icon: Users, tone: "blue" },
    { label: "Mdaiwa Mpya", href: "/customers?new=1", icon: ReceiptText, tone: "green" },
    { label: "Mizigo", href: "/cargo", icon: Search, tone: "purple" },
    { label: "Mzigo Mpya", href: "/cargo?new=1", icon: PackagePlus, tone: "orange" },
  ];

  return (
    <AppShell user={{ jina: sessionUser.jina, jinaDuka: user.jina_duka, isAdmin: sessionUser.role === "ADMIN", businessRole: sessionUser.businessRole }}>
      {/* ============ Hero ============ */}
      <section
        className="anim-up relative mb-8 overflow-hidden rounded-2xl p-6 text-white shadow-glass md:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary-2) 70%, var(--primary)) 55%, var(--info) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px);background-size:22px_22px]"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/70">
              <Sparkles className="size-3.5" /> Dashibodi · {user.jina_duka}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-snug md:text-3xl">
              Karibu tena, {firstName}
            </h1>
            <p className="mt-1 text-sm text-white/80">{today}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link href="/customers?new=1" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-lg transition hover:-translate-y-0.5">
                <Plus className="size-4" /> Mdaiwa Mpya
              </Link>
              <Link href="/cargo?new=1" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">
                <PackagePlus className="size-4" /> Mzigo Mpya
              </Link>
              {activeCargo > 0 ? (
                <Link href="/cargo" className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur transition hover:bg-white/25">
                  <Hourglass className="size-3.5" /> {activeCargo} mzigo haujafika
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:min-w-[240px] sm:flex-col">
            <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
              <p className="text-[11px] text-white/70 sm:text-xs">Imekusanya kwa wiki hii</p>
              <p className="text-base font-bold sm:text-xl">
                {chartData.reduce((s, d) => s + d.value, 0) > 0
                  ? "TZS " + chartData.reduce((s, d) => s + d.value, 0).toLocaleString("en-TZ")
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2.5 text-sm backdrop-blur sm:px-4 sm:py-3">
              <TrendingUp className="size-4 shrink-0 text-white" />
              <span className="text-[11px] text-white/85 sm:text-sm">{madaiwaYanayoendelea} deni bado linaendelea</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Stats ============ */}
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, tone }, i) => (
          <div
            key={label}
            className="anim-up panel group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-glass"
            style={{ animationDelay: DELAY[i % DELAY.length] }}
          >
            <div aria-hidden className={`absolute -right-8 -top-8 size-24 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100`} style={{ background: `color-mix(in srgb, var(${toneVar(tone)}) 35%, transparent)` }} />
            <div aria-hidden className={`absolute inset-x-0 top-0 h-1`} style={{ background: `var(${toneVar(tone)})` }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="mt-1.5 text-lg font-bold text-ink sm:text-xl">{value}</p>
                <p className="mt-1 whitespace-nowrap text-xs text-ink-2">{sub}</p>
              </div>
              <span
                className="grid size-11 shrink-0 place-items-center rounded-2xl transition"
                style={{ background: `color-mix(in srgb, var(${toneVar(tone)}) 14%, transparent)`, color: `var(${toneVar(tone)})` }}
              >
                <Icon className="size-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ============ Cargo overview ============ */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-2/70 px-5 py-4 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-ink">
              <Boxes className="size-5 text-success" /> Muhtasari wa Mizigo
            </p>
            <p className="mt-1 text-xs text-ink-3">Hali ya mizigo na bidhaa ulizoagiza</p>
          </div>
          <Link href="/cargo" className="btn btn-soft btn-sm">
            Ona mizigo yote <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid border-b border-line sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Mizigo yote", value: cargos.length.toLocaleString("en-TZ"), icon: Package, color: "var(--primary)" },
            { label: "Ipo njiani", value: activeCargo.toLocaleString("en-TZ"), icon: Truck, color: "var(--warning)" },
            { label: "Imefika", value: arrivedCargo.toLocaleString("en-TZ"), icon: CheckCircle2, color: "var(--success)" },
            { label: "Thamani ya mizigo", value: fmtPesa(totalCargoValue), icon: Wallet, color: "var(--info)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 border-b border-line p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)]">
          <div className="border-b border-line lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-5 pb-2 pt-5 sm:px-6">
              <p className="text-sm font-semibold text-ink">Mizigo ya karibuni</p>
              <span className="text-xs text-ink-3">{recentCargo.length} ya mwisho</span>
            </div>
            {recentCargo.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <Package className="mx-auto size-7 text-ink-3" />
                <p className="mt-2 text-sm text-ink-3">Hakuna mizigo iliyoandikwa bado.</p>
              </div>
            ) : (
              <div className="divide-y divide-line/70">
                {recentCargo.map((cargo) => {
                  const arrivedItems = cargo.items.filter((item) => item.imefika || cargo.hali === "Imefika").length;
                  const totalItems = cargo.items.length;
                  const progress = totalItems > 0 ? Math.round((arrivedItems / totalItems) * 100) : 0;
                  return (
                    <Link key={cargo.id} href="/cargo" className="group grid gap-3 px-5 py-3.5 transition hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                          <Factory className="size-[18px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">{cargo.jinaKampuni}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-3">
                            <CalendarClock className="size-3" /> {fmtTarehe(cargo.tareheKuagiza)} · {totalItems} bidhaa
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:min-w-[210px]">
                        <div className="min-w-0 flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                            <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-ink-3">{arrivedItems}/{totalItems} zimefika</p>
                        </div>
                        <Badge tone={cargo.hali === "Imefika" ? "done" : "wait"}>
                          {cargo.hali === "Imefika" ? "Imefika" : "Njiani"}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Maendeleo ya bidhaa</p>
                <p className="mt-1 text-xs text-ink-3">Bidhaa zilizowasili</p>
              </div>
              <span className="text-2xl font-bold text-success">{cargoProgress}%</span>
            </div>
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-gradient-to-r from-success to-primary-2 transition-[width] duration-700" style={{ width: `${cargoProgress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-success/8 p-3">
                <p className="text-xs text-ink-3">Zimefika</p>
                <p className="mt-1 text-lg font-bold text-success">{arrivedCargoItems}</p>
              </div>
              <div className="rounded-lg bg-warning/8 p-3">
                <p className="text-xs text-ink-3">Zinasubiriwa</p>
                <p className="mt-1 text-lg font-bold text-warning">{Math.max(cargoItemsCount - arrivedCargoItems, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Health + chart ============ */}
      <section className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="anim-up lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Hali ya Biashara</span>} action={<Badge tone={paidPct >= 100 ? "done" : "wait"}>{paidPct}% imelipwa</Badge>} />
          <CardBody>
            <div className="grid gap-6 sm:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs text-ink-3">Jumla ya madeni yote</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">{fmtPesa(jumlaMadeni)}</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line bg-surface-2 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-ink-3"><CheckCircle2 className="size-3.5 text-success" /> Imelipwa</div>
                    <p className="mt-1 text-lg font-bold text-success">{fmtPesa(jumlaLipwa)}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface-2 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-ink-3"><Hourglass className="size-3.5 text-warning" /> Imebaki</div>
                    <p className="mt-1 text-lg font-bold text-warning">{fmtPesa(jumlaBakaa)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-l-full transition-[width] duration-700" style={{ width: `${paidPct}%`, background: "linear-gradient(90deg, var(--success), color-mix(in srgb, var(--success) 60%, var(--primary)))" }} />
                    {paidPct < 100 ? <div className="h-full flex-1 rounded-r-full" style={{ background: "linear-gradient(90deg, var(--warning), color-mix(in srgb, var(--warning) 60%, var(--danger)))" }} /> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> Imelipwa · {paidPct}%</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> Imebaki · {100 - paidPct}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface-2 p-4">
                <PaymentsChart data={chartData} />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card className="anim-up" >
          <CardHeader title={<span className="flex items-center gap-2"><HandCoins className="size-4 text-primary" /> Vitendo vya Haraka</span>} />
          <CardBody className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, href, icon: Icon, tone }, i) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface-2 p-4 text-sm font-medium text-ink-2 transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-glass"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="grid size-11 place-items-center rounded-2xl transition group-hover:scale-105" style={{ background: `color-mix(in srgb, var(${toneVar(tone)}) 13%, transparent)`, color: `var(${toneVar(tone)})` }}>
                  <Icon className="size-5" />
                </span>
                {label}
                <ArrowUpRight className="size-3.5 text-ink-3 opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </CardBody>
        </Card>
      </section>

      {/* ============ Recent debts + payments ============ */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="anim-up lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><LayoutList className="size-4 text-primary" /> Madeni ya Hivi Karibuni</span>} action={<Link href="/customers" className="text-sm font-medium text-primary hover:underline">Ona Yote →</Link>} />
          <CardBody className="p-0">
            {madeniKaribuni.length === 0 ? (
              <EmptyState text="Hakuna madeni yaliyoandikwa bado." href="/customers?new=1" cta="Ongeza Mdaiwa wa Kwanza" />
            ) : (
              <>
                {/* Mobile: stacked cards */}
                <div className="divide-y divide-line/60 md:hidden">
                  {madeniKaribuni.map((d) => {
                    const pct = pctPaid(d.kiasiAsili, d.kiasiKilicholipwa);
                    return (
                      <div key={d.id} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl font-bold" style={{ background: `color-mix(in srgb, var(--primary) 13%, transparent)`, color: "var(--primary)" }}>
                            {initial(d.customer?.jina ?? "?")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link href={`/customers/${d.mtejaId}`} className="block truncate font-medium text-ink hover:text-primary">
                              {d.customer?.jina ?? "—"}
                            </Link>
                            <p className="truncate text-xs text-ink-3">{d.jinaBidhaa ?? ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="whitespace-nowrap text-sm font-semibold text-ink">{fmtPesa(d.kiasiAsili)}</p>
                            {d.imekamilika ? <Badge tone="done">Imelipwa</Badge> : <Badge tone="wait">Inadaiwa</Badge>}
                          </div>
                        </div>
                        <div className="mt-3">
                          <ProgressBar pct={pct} />
                          <span className="mt-1 block text-[11px] text-ink-3">{pct}% imelipwa</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Tablet/desktop: table */}
                <div className="hidden overflow-x-auto md:block">
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
                    {madeniKaribuni.map((d) => {
                      const pct = pctPaid(d.kiasiAsili, d.kiasiKilicholipwa);
                      return (
                        <tr key={d.id} className="border-b border-line/60 transition-colors hover:bg-surface-2">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl font-bold" style={{ background: `color-mix(in srgb, var(--primary) 13%, transparent)`, color: "var(--primary)" }}>
                                {initial(d.customer?.jina ?? "?")}
                              </span>
                              <Link href={`/customers/${d.mtejaId}`} className="font-medium text-ink hover:text-primary">
                                {d.customer?.jina ?? "—"}
                              </Link>
                            </div>
                          </td>
                          <td className="max-w-[150px] truncate px-5 py-3.5 text-ink-2">{d.jinaBidhaa ?? "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">{fmtPesa(d.kiasiAsili)}</td>
                          <td className="px-5 py-3.5">
                            <div className="w-32">
                              <ProgressBar pct={pct} />
                              <span className="mt-1 block text-[11px] text-ink-3">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {d.imekamilika ? <Badge tone="done">Imelipwa</Badge> : <Badge tone="wait">Inadaiwa</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="anim-up">
            <CardHeader title={<span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" /> Malipo ya Hivi Karibuni</span>} />
            <CardBody className="p-0">
              {malipoKaribuni.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna malipo bado</p>
              ) : (
                <div className="divide-y divide-line/60">
                  {malipoKaribuni.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--info))" }}>
                        {initial(m.debt?.customer?.jina ?? "?")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{m.debt?.customer?.jina ?? "—"}</p>
                        <p className="truncate text-xs text-ink-3">{m.debt?.jinaBidhaa ?? ""} · {fmtTarehe(m.tarehe)}</p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-bold text-success">+{fmtPesa(m.kiasi)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="anim-up">
            <CardBody className="flex items-center gap-3 py-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, var(--info) 14%, transparent)`, color: "var(--info)" }}>
                <Files className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Ripoti za PDF</p>
                <p className="text-xs text-ink-3">Rekodi ya madeni na malipo</p>
              </div>
              <Link href="/customers" className="btn btn-soft btn-sm">Zioni</Link>
            </CardBody>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

function toneVar(tone: string): string {
  return (
    { blue: "--primary", red: "--danger", green: "--success", orange: "--warning", purple: "--info" } as Record<string, string>
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
