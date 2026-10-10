import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileDown,
  FileSpreadsheet,
  HandCoins,
  Lock,
  Package,
  Percent,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { businessIdFor, getBusinessOwner, planAllows, requireBusinessRole, subscriptionIsActive } from "@/lib/auth";
import { getReportData, parseReportPeriod, REPORT_PERIODS, type ReportPeriod } from "@/lib/reports-data";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BarList, ShareBar, TrendChart } from "@/components/reports/report-charts";

export const metadata: Metadata = { title: "Ripoti" };
export const dynamic = "force-dynamic";

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const count = (value: number) => value.toLocaleString("en-TZ");

const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

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

function SectionTitle({ id, icon: Icon, title, text }: { id: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <div id={id} className="mb-4 flex scroll-mt-24 items-center gap-3">
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-3">{text}</p>
      </div>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const user = await requireBusinessRole(["OWNER", "MANAGER"]);
  const owner = await getBusinessOwner(user);
  if (!owner) return null;

  const period = parseReportPeriod(params.period);
  const canExport = subscriptionIsActive(owner);
  const data = await getReportData(businessIdFor(user), period, planAllows(owner, "cargo"));
  const { business, debts, cargo } = data;

  return (
    <AppShell user={{ jina: user.jina, jinaDuka: owner.jina_duka, isAdmin: user.role === "ADMIN", businessRole: user.businessRole }}>
      {!canExport && <p className="hidden print:block">Lipia subscription ya RexaBook ili kuchapisha au kupakua ripoti.</p>}
      <div className={canExport ? undefined : "print:hidden"}>
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Ripoti</h1>
            <p className="mt-1 text-sm text-ink-3">{owner.jina_duka} · {data.periodLabel} ({data.rangeLabel})</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canExport ? (
              <>
                <a href={`/api/reports/export?period=${period}&format=pdf`} className="btn btn-primary btn-sm"><FileDown className="size-4" /> Pakua PDF</a>
                <a href={`/api/reports/export?period=${period}&format=csv`} className="btn btn-outline btn-sm"><FileSpreadsheet className="size-4" /> Pakua Excel (CSV)</a>
              </>
            ) : (
              <span className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-3"><Lock className="size-4" /> Kupakua kumefungwa</span>
            )}
          </div>
        </header>

        {!canExport && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-ink-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
              Subscription imeisha. Unaweza kuona ripoti zote hapa, lakini kupakua PDF, Excel au kuchapisha kumefungwa hadi ulipie.
            </p>
            {user.businessRole === "OWNER" && <Link href="/business" className="btn btn-primary btn-sm">Lipia sasa</Link>}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1" aria-label="Kipindi cha ripoti">
            {(Object.keys(REPORT_PERIODS) as ReportPeriod[]).map((key) => (
              <Link
                key={key}
                href={`/reports?period=${key}`}
                aria-current={key === period ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${key === period ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"}`}
              >
                {REPORT_PERIODS[key]}
              </Link>
            ))}
          </nav>
          <nav className="flex gap-3 text-sm font-medium text-primary" aria-label="Sehemu za ripoti">
            <a href="#biashara" className="hover:underline">Biashara</a>
            <a href="#wadaiwa" className="hover:underline">Wadaiwa</a>
            {cargo && <a href="#mizigo" className="hover:underline">Mizigo</a>}
          </nav>
        </div>

        {/* ── Biashara ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionTitle id="biashara" icon={ShoppingCart} title="Biashara" text="Mauzo, faida, matumizi na stock ya duka." />
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Mauzo" value={money(business.revenue)} note={`Mauzo ${count(business.salesCount)}`} icon={TrendingUp} tone="bg-primary/10 text-primary" />
            <Tile label="Faida ghafi" value={money(business.grossProfit)} note="Mauzo kutoa gharama ya bidhaa" icon={CircleDollarSign} tone="bg-info/10 text-info" />
            <Tile label="Matumizi" value={money(business.expenses)} icon={WalletCards} tone="bg-warning/10 text-warning" />
            <Tile
              label="Faida halisi"
              value={money(business.netProfit)}
              note={`${business.marginPercent}% ya mauzo`}
              icon={business.netProfit >= 0 ? CheckCircle2 : AlertTriangle}
              tone={business.netProfit >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}
            />
            <Tile label="Wastani wa mauzo" value={money(business.averageSale)} note="Kwa kila risiti" icon={ReceiptText} tone="bg-primary/10 text-primary" />
            <Tile label="Thamani ya stock" value={money(business.stockCostValue)} note={`Ikiuzwa yote: ${money(business.stockSaleValue)}`} icon={Boxes} tone="bg-info/10 text-info" />
            <Tile label="Bidhaa" value={count(business.productCount)} icon={Package} tone="bg-primary/10 text-primary" />
            <Tile
              label="Stock ndogo"
              value={count(business.lowStockCount)}
              note={business.lowStockCount ? "Zinahitaji kuongezwa" : "Hakuna tatizo"}
              icon={AlertTriangle}
              tone={business.lowStockCount ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}
            />
          </div>

          <Card className="mb-5">
            <CardHeader title="Mwenendo wa mauzo na matumizi" />
            <CardBody>
              <TrendChart series={[{ label: "Mauzo", color: CHART[0] }, { label: "Matumizi", color: CHART[1] }]} data={business.trend} />
            </CardBody>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card><CardHeader title="Bidhaa zinazouzika zaidi" /><CardBody><BarList items={business.topProducts} color={CHART[0]} emptyText="Hakuna mauzo kwa kipindi hiki." /></CardBody></Card>
            <Card><CardHeader title="Mauzo kwa njia ya malipo" /><CardBody><ShareBar items={business.paymentMethods} colors={CHART} emptyText="Hakuna mauzo kwa kipindi hiki." /></CardBody></Card>
            <Card><CardHeader title="Matumizi kwa aina" /><CardBody><BarList items={business.expenseCategories} color={CHART[1]} emptyText="Hakuna matumizi kwa kipindi hiki." /></CardBody></Card>
            <Card><CardHeader title="Bidhaa zenye stock ndogo" /><CardBody><BarList items={business.lowStock} color={CHART[3]} format="count" emptyText="Hakuna bidhaa yenye stock ndogo." /></CardBody></Card>
          </div>
        </section>

        {/* ── Wadaiwa ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionTitle id="wadaiwa" icon={Users} title="Wadaiwa" text="Madeni yanayodaiwa, mikopo mipya na malipo yaliyopokelewa." />
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Deni linalodaiwa sasa" value={money(debts.outstanding)} note={`Madeni ${count(debts.openCount)} yaliyo wazi`} icon={HandCoins} tone="bg-danger/10 text-danger" />
            <Tile label="Mikopo kipindi hiki" value={money(debts.lent)} icon={TrendingUp} tone="bg-primary/10 text-primary" />
            <Tile label="Malipo yaliyopokelewa" value={money(debts.collected)} icon={CircleDollarSign} tone="bg-success/10 text-success" />
            <Tile label="Kiwango cha ulipaji" value={`${debts.collectionRate}%`} note="Cha mikopo yote iliyowahi kutolewa" icon={Percent} tone="bg-info/10 text-info" />
            <Tile label="Wateja wenye deni" value={count(debts.debtorsCount)} note={`Kati ya wateja ${count(debts.customersCount)}`} icon={Users} tone="bg-warning/10 text-warning" />
            <Tile label="Madeni yaliyokamilika" value={count(debts.settledCount)} icon={CheckCircle2} tone="bg-success/10 text-success" />
          </div>

          <Card className="mb-5">
            <CardHeader title="Mikopo iliyotolewa na malipo yaliyopokelewa" />
            <CardBody>
              <TrendChart series={[{ label: "Mikopo", color: CHART[1] }, { label: "Malipo", color: CHART[2] }]} data={debts.trend} />
            </CardBody>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card><CardHeader title="Wadaiwa wakubwa" /><CardBody><BarList items={debts.topDebtors} color={CHART[1]} emptyText="Hakuna mteja mwenye deni." /></CardBody></Card>
            <Card><CardHeader title="Umri wa madeni yanayodaiwa" /><CardBody><BarList items={debts.aging} color={CHART[0]} emptyText="Hakuna deni linalodaiwa." /></CardBody></Card>
          </div>
        </section>

        {/* ── Mizigo ───────────────────────────────────────────────── */}
        {cargo && (
          <section>
            <SectionTitle id="mizigo" icon={Truck} title="Mizigo" text="Mizigo iliyoagizwa kipindi hiki, gharama zake na hali ya kufika." />
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="Mizigo iliyoagizwa" value={count(cargo.count)} note={`Bidhaa ${count(cargo.itemsCount)}`} icon={Package} tone="bg-primary/10 text-primary" />
              <Tile label="Gharama ya mizigo" value={money(cargo.totalCost)} icon={CircleDollarSign} tone="bg-info/10 text-info" />
              <Tile label="Imefika" value={count(cargo.arrived)} note={`Njiani ${count(cargo.pending)}`} icon={CheckCircle2} tone="bg-success/10 text-success" />
              <Tile
                label="Imechelewa"
                value={count(cargo.late)}
                note={cargo.averageDays === null ? "Hakuna wastani wa kufika bado" : `Wastani wa kufika: siku ${cargo.averageDays}`}
                icon={CalendarClock}
                tone={cargo.late ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}
              />
            </div>

            <Card className="mb-5">
              <CardHeader title="Gharama ya mizigo iliyoagizwa" />
              <CardBody><TrendChart series={[{ label: "Gharama ya mizigo", color: CHART[0] }]} data={cargo.trend} /></CardBody>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card><CardHeader title="Gharama kwa kampuni" /><CardBody><BarList items={cargo.suppliers} color={CHART[0]} emptyText="Hakuna mzigo kwa kipindi hiki." /></CardBody></Card>
              <Card><CardHeader title="Hali ya mizigo" /><CardBody><ShareBar items={cargo.status} colors={[CHART[2], CHART[0], CHART[1]]} format="count" emptyText="Hakuna mzigo kwa kipindi hiki." /></CardBody></Card>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
