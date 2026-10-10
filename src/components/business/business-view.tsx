"use client";

import { useState } from "react";
import {
  Activity,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Download,
  PackageCheck,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ExpensesPanel } from "@/components/business/expenses-panel";
import { ProductsPanel } from "@/components/business/products-panel";
import { SalesPanel } from "@/components/business/sales-panel";
import { SubscriptionPanel } from "@/components/business/subscription-panel";
import { TeamPanel } from "@/components/business/team-panel";

type BusinessRole = "OWNER" | "MANAGER" | "CASHIER";
type PlanId = "BASIC" | "FULL";
type TabId = "overview" | "sales" | "products" | "expenses" | "team" | "subscription" | "audit";

export interface BusinessViewData {
  role: BusinessRole;
  snippeConfigured: boolean;
  subscription: { status: string; active: boolean; exempt: boolean; trial: boolean; plan: PlanId; planLabel: string; endsAt: string | null; daysLeft: number };
  features: { staff: boolean; cargo: boolean; backup: boolean; audit: boolean };
  upgradeNotice: boolean;
  stats: { revenue: number; grossProfit: number; expenses: number; netProfit: number; stockValue: number; lowStock: number };
  products: Array<{ id: number; name: string; sku: string; unit: string; buyingPrice: number; sellingPrice: number; stock: number; lowStockAt: number }>;
  sales: Array<{ id: number; receiptNumber: string; customerName: string | null; customerPhone: string | null; servedBy: string | null; paymentMethod: string; paymentReference: string | null; total: number; paidAmount: number; profit: number; createdAt: string; items: Array<{ name: string; quantity: number; unitPrice: number; total: number }> }>;
  expenses: Array<{ id: number; category: string; amount: number; note: string | null; createdAt: string }>;
  customers: Array<{ id: number; jina: string; simu: string | null }>;
  staff: Array<{ id: number; name: string; role: BusinessRole; active: boolean; createdAt: string }>;
  audits: Array<{ id: number; actor: string; action: string; entity: string; details: string | null; createdAt: string }>;
  subscriptionPayments: Array<{ id: number; amount: number; months: number; plan: PlanId; status: string; paymentStatus: string | null; reference: string | null; createdAt: string }>;
}

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

const tabOptions: Array<{ id: TabId; label: string; icon: typeof Activity; roles: BusinessRole[] }> = [
  { id: "overview", label: "Muhtasari", icon: Activity, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { id: "sales", label: "Mauzo", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { id: "products", label: "Bidhaa", icon: Boxes, roles: ["OWNER", "MANAGER"] },
  { id: "expenses", label: "Matumizi", icon: WalletCards, roles: ["OWNER", "MANAGER"] },
  { id: "team", label: "Wafanyakazi", icon: UserRoundCog, roles: ["OWNER"] },
  { id: "subscription", label: "Subscription", icon: Smartphone, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { id: "audit", label: "Audit", icon: ClipboardList, roles: ["OWNER", "MANAGER"] },
];

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-ink-3">{children}</div>;
}

export function BusinessView({ data }: { data: BusinessViewData }) {
  // Anyone in the shop may pay, so a lapsed subscription opens straight on the place to fix it.
  const [tab, setTab] = useState<TabId>(!data.subscription.active ? "subscription" : "overview");

  const lockedTabs: Partial<Record<TabId, boolean>> = {
    subscription: data.subscription.exempt,
    team: !data.features.staff,
    audit: !data.features.audit,
  };
  const availableTabs = tabOptions.filter((option) => option.roles.includes(data.role) && !lockedTabs[option.id]);

  const subscriptionBadge = data.subscription.active ? "badge-done" : "badge-danger";

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness className="size-5" /></span>
          <div><h1 className="text-2xl font-semibold text-ink">Biashara</h1><p className="mt-1 text-sm text-ink-3">Stock, mauzo, matumizi, faida na timu katika sehemu moja.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${subscriptionBadge}`}>{data.subscription.exempt ? "Admin · hakuna malipo" : !data.subscription.active ? "Subscription imeisha" : data.subscription.trial ? "Majaribio" : `Kifurushi: ${data.subscription.planLabel}`}</span>
          {data.role === "OWNER" && data.features.backup && data.subscription.active && <a href="/api/backup" className="btn btn-outline btn-sm"><Download className="size-4" /> Backup</a>}
        </div>
      </header>
      {data.upgradeNotice && !data.features.cargo && <p className="mb-5 rounded-lg bg-warning/10 px-4 py-3 text-sm text-ink-2">Sehemu hiyo inapatikana kwenye kifurushi cha Kamili. Pandisha kifurushi kwenye tab ya Subscription.</p>}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Sehemu za biashara">
        {availableTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${tab === id ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-ink-2 hover:border-primary/30"}`}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Mauzo ya mwezi", money(data.stats.revenue), TrendingUp, "text-primary bg-primary/10"],
              ["Faida ghafi", money(data.stats.grossProfit), ShoppingCart, "text-info bg-info/10"],
              ["Matumizi", money(data.stats.expenses), WalletCards, "text-warning bg-warning/10"],
              ["Faida halisi", money(data.stats.netProfit), CheckCircle2, data.stats.netProfit >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"],
              ["Thamani ya stock", money(data.stats.stockValue), Boxes, "text-primary bg-primary/10"],
              ["Stock ndogo", data.stats.lowStock.toLocaleString("en-TZ"), PackageCheck, data.stats.lowStock ? "text-danger bg-danger/10" : "text-success bg-success/10"],
            ].map(([label, value, Icon, tone]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-card">
                <div><p className="text-xs font-medium uppercase text-ink-3">{label as string}</p><p className="mt-2 text-xl font-semibold text-ink">{value as string}</p></div>
                <span className={`grid size-10 place-items-center rounded-lg ${tone as string}`}><Icon className="size-5" /></span>
              </div>
            ))}
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title="Mauzo ya karibuni" action={<button onClick={() => setTab("sales")} className="text-sm font-semibold text-primary">Ona yote</button>} /><CardBody className="!p-0">{data.sales.length === 0 ? <Empty>Hakuna mauzo bado.</Empty> : <div className="divide-y divide-line">{data.sales.slice(0, 5).map((sale) => <div key={sale.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-ink">{sale.receiptNumber}</p><p className="text-xs text-ink-3">{sale.customerName || "Mteja wa kawaida"} · {date(sale.createdAt)}</p></div><p className="font-semibold text-success">{money(sale.total)}</p></div>)}</div>}</CardBody></Card>
            <Card><CardHeader title="Bidhaa zinazohitaji stock" action={<span className="badge badge-wait">{data.stats.lowStock}</span>} /><CardBody className="!p-0">{data.products.filter((product) => product.stock <= product.lowStockAt).length === 0 ? <Empty>Stock zote ziko vizuri.</Empty> : <div className="divide-y divide-line">{data.products.filter((product) => product.stock <= product.lowStockAt).slice(0, 6).map((product) => <div key={product.id} className="flex items-center justify-between px-5 py-3"><div><p className="font-semibold text-ink">{product.name}</p><p className="text-xs text-ink-3">{product.sku}</p></div><span className="badge badge-danger">{product.stock} {product.unit}</span></div>)}</div>}</CardBody></Card>
          </div>
        </div>
      )}

      {tab === "products" && <ProductsPanel products={data.products} locked={!data.subscription.active} />}

      {tab === "sales" && (
        <SalesPanel
          products={data.products}
          customers={data.customers}
          sales={data.sales}
          locked={!data.subscription.active}
          onPay={data.subscription.exempt ? undefined : () => setTab("subscription")}
        />
      )}

      {tab === "expenses" && <ExpensesPanel expenses={data.expenses} monthTotal={data.stats.expenses} locked={!data.subscription.active} />}

      {tab === "team" && <TeamPanel staff={data.staff} />}

      {tab === "subscription" && !data.subscription.exempt && (
        <SubscriptionPanel subscription={data.subscription} payments={data.subscriptionPayments} snippeConfigured={data.snippeConfigured} />
      )}

      {tab === "audit" && <Card><CardHeader title="Historia ya Shughuli" action={<span className="badge badge-info">{data.audits.length}</span>} /><CardBody className="!p-0">{data.audits.length === 0 ? <Empty>Audit log itaanza kuonekana baada ya shughuli mpya.</Empty> : <div className="divide-y divide-line">{data.audits.map((audit) => <div key={audit.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[170px_1fr_auto] sm:items-center"><p className="text-sm font-semibold text-ink">{audit.actor}</p><div><p className="text-sm text-ink-2">{audit.action.replaceAll("_", " ")}</p><p className="text-xs text-ink-3">{audit.entity}</p></div><time className="text-xs text-ink-3">{date(audit.createdAt)}</time></div>)}</div>}</CardBody></Card>}
    </div>
  );
}
