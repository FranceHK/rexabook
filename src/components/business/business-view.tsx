"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  MessageCircle,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import {
  adjustProductStockAction,
  checkSubscriptionPaymentAction,
  createExpenseAction,
  createProductAction,
  createSaleAction,
  createStaffAction,
  moveCargoToStockAction,
  startSubscriptionPaymentAction,
  toggleStaffAction,
} from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/theme/toast-provider";

type BusinessRole = "OWNER" | "MANAGER" | "CASHIER";
type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK" | "CREDIT";
type TabId = "overview" | "sales" | "products" | "expenses" | "cargo" | "team" | "subscription" | "audit";

export interface BusinessViewData {
  role: BusinessRole;
  snippeConfigured: boolean;
  subscription: { status: string; active: boolean; endsAt: string | null };
  stats: { revenue: number; grossProfit: number; expenses: number; netProfit: number; stockValue: number; lowStock: number };
  products: Array<{ id: number; name: string; sku: string; unit: string; buyingPrice: number; sellingPrice: number; stock: number; lowStockAt: number }>;
  sales: Array<{ id: number; receiptNumber: string; customerName: string | null; customerPhone: string | null; servedBy: string | null; paymentMethod: PaymentMethod; total: number; paidAmount: number; profit: number; createdAt: string; items: Array<{ name: string; quantity: number; unitPrice: number; total: number }> }>;
  expenses: Array<{ id: number; category: string; amount: number; note: string | null; createdAt: string }>;
  customers: Array<{ id: number; jina: string; simu: string | null }>;
  cargos: Array<{ id: number; supplier: string; tracking: string | null; baseCost: number; items: Array<{ name: string; quantity: number; total: number }> }>;
  staff: Array<{ id: number; name: string; role: BusinessRole; active: boolean; createdAt: string }>;
  audits: Array<{ id: number; actor: string; action: string; entity: string; details: string | null; createdAt: string }>;
  subscriptionPayments: Array<{ id: number; amount: number; months: number; status: string; paymentStatus: string | null; reference: string | null; createdAt: string }>;
}

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

const tabOptions: Array<{ id: TabId; label: string; icon: typeof Activity; roles: BusinessRole[] }> = [
  { id: "overview", label: "Muhtasari", icon: Activity, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { id: "sales", label: "Mauzo", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER"] },
  { id: "products", label: "Bidhaa", icon: Boxes, roles: ["OWNER", "MANAGER"] },
  { id: "expenses", label: "Matumizi", icon: WalletCards, roles: ["OWNER", "MANAGER"] },
  { id: "cargo", label: "Mzigo → Stock", icon: PackageCheck, roles: ["OWNER", "MANAGER"] },
  { id: "team", label: "Wafanyakazi", icon: UserRoundCog, roles: ["OWNER"] },
  { id: "subscription", label: "Subscription", icon: Smartphone, roles: ["OWNER"] },
  { id: "audit", label: "Audit", icon: ClipboardList, roles: ["OWNER", "MANAGER"] },
];

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-ink-3">{children}</div>;
}

export function BusinessView({ data }: { data: BusinessViewData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [saleProductId, setSaleProductId] = useState(data.products[0]?.id ?? 0);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerId, setCustomerId] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [extraCosts, setExtraCosts] = useState<Record<number, number>>({});

  const availableTabs = tabOptions.filter((option) => option.roles.includes(data.role));
  const cartRows = useMemo(() => cart.map((item) => ({ ...item, product: data.products.find((product) => product.id === item.productId)! })).filter((item) => item.product), [cart, data.products]);
  const cartTotal = cartRows.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);

  function addCartItem() {
    const product = data.products.find((item) => item.id === saleProductId);
    if (!product || saleQuantity < 1) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const nextQuantity = (existing?.quantity ?? 0) + saleQuantity;
      if (nextQuantity > product.stock) {
        toast(`Stock ya ${product.name} haitoshi.`, "error");
        return current;
      }
      return existing
        ? current.map((item) => item.productId === product.id ? { ...item, quantity: nextQuantity } : item)
        : [...current, { productId: product.id, quantity: saleQuantity }];
    });
    setSaleQuantity(1);
  }

  async function submitForm(key: string, form: HTMLFormElement, action: (prev: null, formData: FormData) => Promise<{ success: boolean; message: string }>) {
    setBusy(key);
    const result = await action(null, new FormData(form));
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      form.reset();
      router.refresh();
    }
  }

  async function saveSale() {
    setBusy("sale");
    const result = await createSaleAction({
      customerId: customerId || null,
      paymentMethod,
      paidAmount,
      items: cart,
    });
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      setCart([]);
      setPaidAmount(0);
      router.refresh();
      if (result.id) window.open(`/api/sales/${result.id}/receipt`, "_blank", "noopener,noreferrer");
    }
  }

  async function adjustStock(productId: number, current: number) {
    const raw = window.prompt(`Stock ya sasa ni ${current}. Weka idadi ya kuongeza au kutoa, mfano 5 au -2:`);
    if (!raw) return;
    const delta = Number(raw);
    setBusy(`stock-${productId}`);
    const result = await adjustProductStockAction(productId, delta);
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
  }

  const subscriptionBadge = data.subscription.active ? "badge-done" : "badge-danger";

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness className="size-5" /></span>
          <div><h1 className="text-2xl font-semibold text-ink">Biashara</h1><p className="mt-1 text-sm text-ink-3">Stock, mauzo, matumizi, faida na timu katika sehemu moja.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${subscriptionBadge}`}>{data.subscription.active ? "Subscription hai" : "Subscription imeisha"}</span>
          {data.role === "OWNER" && <a href="/api/backup" className="btn btn-outline btn-sm"><Download className="size-4" /> Backup</a>}
        </div>
      </header>

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

      {tab === "products" && (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card><CardHeader title="Ongeza Bidhaa" /><CardBody><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitForm("product", event.currentTarget, createProductAction); }}>
            <Input label="Jina la bidhaa" name="jina" required />
            <div className="grid grid-cols-2 gap-3"><Input label="SKU" name="sku" placeholder="MF-001" required /><Input label="Kitengo" name="kitengo" defaultValue="pc" required /></div>
            <div className="grid grid-cols-2 gap-3"><Input label="Bei ya kununua" name="bei_kununua" type="number" min="0" defaultValue="0" required /><Input label="Bei ya kuuza" name="bei_kuuza" type="number" min="0" defaultValue="0" required /></div>
            <div className="grid grid-cols-2 gap-3"><Input label="Stock ya kuanzia" name="stock" type="number" min="0" defaultValue="0" required /><Input label="Tahadhari ikifika" name="stock_tahadhari" type="number" min="0" defaultValue="5" required /></div>
            <Button type="submit" loading={busy === "product"} icon={<Plus />} className="w-full">Ongeza Bidhaa</Button>
          </form></CardBody></Card>
          <Card><CardHeader title="Bidhaa na Stock" action={<span className="badge badge-info">{data.products.length} bidhaa</span>} /><CardBody className="!p-0"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-line bg-surface-2 text-xs uppercase text-ink-3"><tr><th className="px-5 py-3">Bidhaa</th><th className="px-4 py-3">Bei Nunua</th><th className="px-4 py-3">Bei Uza</th><th className="px-4 py-3">Stock</th><th className="px-5 py-3 text-right">Hatua</th></tr></thead><tbody className="divide-y divide-line">{data.products.map((product) => <tr key={product.id}><td className="px-5 py-3"><p className="font-semibold text-ink">{product.name}</p><p className="text-xs text-ink-3">{product.sku} · {product.unit}</p></td><td className="px-4 py-3">{money(product.buyingPrice)}</td><td className="px-4 py-3">{money(product.sellingPrice)}</td><td className="px-4 py-3"><span className={`badge ${product.stock <= product.lowStockAt ? "badge-danger" : "badge-done"}`}>{product.stock}</span></td><td className="px-5 py-3 text-right"><Button size="sm" variant="outline" loading={busy === `stock-${product.id}`} onClick={() => adjustStock(product.id, product.stock)}>Rekebisha</Button></td></tr>)}</tbody></table>{data.products.length === 0 && <Empty>Ongeza bidhaa yako ya kwanza.</Empty>}</div></CardBody></Card>
        </div>
      )}

      {tab === "sales" && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card><CardHeader title="Mauzo Mapya" /><CardBody className="space-y-4">
            {!data.subscription.active && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">Subscription imeisha. Owner anatakiwa kulipia kwanza.</p>}
            <div className="grid grid-cols-[1fr_90px] gap-2"><Select label="Bidhaa" value={saleProductId} onChange={(e) => setSaleProductId(Number(e.target.value))}><option value={0}>Chagua bidhaa</option>{data.products.filter((p) => p.stock > 0).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.stock})</option>)}</Select><Input label="Idadi" type="number" min="1" value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} /></div>
            <Button variant="outline" onClick={addCartItem} icon={<Plus />} className="w-full">Ongeza kwenye mauzo</Button>
            <div className="divide-y divide-line rounded-lg border border-line">{cartRows.length === 0 ? <p className="p-4 text-center text-sm text-ink-3">Hakuna bidhaa zilizochaguliwa.</p> : cartRows.map((item) => <div key={item.productId} className="flex items-center justify-between gap-3 px-3 py-2"><div><p className="text-sm font-semibold text-ink">{item.product.name}</p><p className="text-xs text-ink-3">{item.quantity} × {money(item.product.sellingPrice)}</p></div><button className="text-xs font-semibold text-danger" onClick={() => setCart((c) => c.filter((row) => row.productId !== item.productId))}>Ondoa</button></div>)}</div>
            <div className="flex justify-between rounded-lg bg-surface-2 px-4 py-3"><span className="text-sm text-ink-3">Jumla</span><strong className="text-ink">{money(cartTotal)}</strong></div>
            <Select label="Njia ya malipo" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}><option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile Money</option><option value="BANK">Benki</option><option value="CREDIT">Mkopo</option></Select>
            <Select label={paymentMethod === "CREDIT" ? "Mteja wa mkopo" : "Mteja (hiari)"} value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}><option value={0}>Mteja wa kawaida</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.jina}</option>)}</Select>
            {paymentMethod === "CREDIT" && <Input label="Kiasi kilicholipwa sasa" type="number" min="0" max={cartTotal} value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />}
            <Button onClick={() => void saveSale()} loading={busy === "sale"} disabled={!data.subscription.active || cart.length === 0} icon={<ReceiptText />} className="w-full">Kamilisha na Toa Risiti</Button>
          </CardBody></Card>
          <Card>
            <CardHeader title="Historia ya Mauzo" action={<span className="badge badge-info">{data.sales.length}</span>} />
            <CardBody className="!p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-line bg-surface-2 text-xs uppercase text-ink-3">
                    <tr><th className="px-5 py-3">Risiti</th><th className="px-4 py-3">Mteja</th><th className="px-4 py-3">Malipo</th><th className="px-4 py-3">Jumla</th><th className="px-5 py-3 text-right">Risiti</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.sales.map((sale) => {
                      const message = encodeURIComponent(`Habari ${sale.customerName || "mteja"}, risiti ${sale.receiptNumber}. Jumla ${money(sale.total)}. Asante.`);
                      const whatsappNumber = sale.customerPhone?.replace(/\D/g, "") || "";
                      return (
                        <tr key={sale.id}>
                          <td className="px-5 py-3"><p className="font-semibold text-ink">{sale.receiptNumber}</p><p className="text-xs text-ink-3">{date(sale.createdAt)} · {sale.servedBy || "Mfumo"}</p></td>
                          <td className="px-4 py-3">{sale.customerName || "Kawaida"}</td>
                          <td className="px-4 py-3"><span className="badge badge-info">{sale.paymentMethod.replace("_", " ")}</span></td>
                          <td className="px-4 py-3 font-semibold">{money(sale.total)}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              <a className="btn btn-outline btn-sm" href={`/api/sales/${sale.id}/receipt`} target="_blank" rel="noreferrer"><FileText className="size-4" /> PDF</a>
                              <a className="btn btn-success btn-sm" href={`https://wa.me/${whatsappNumber}?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.sales.length === 0 && <Empty>Hakuna mauzo bado.</Empty>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "expenses" && (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card><CardHeader title="Rekodi Matumizi" /><CardBody><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitForm("expense", event.currentTarget, createExpenseAction); }}><Select label="Aina" name="aina" required><option value="">Chagua</option><option>Usafiri</option><option>Kodi</option><option>Mishahara</option><option>Umeme/Maji</option><option>Masoko</option><option>Stock</option><option>Mengine</option></Select><Input label="Kiasi" name="kiasi" type="number" min="1" required /><Input label="Maelezo" name="maelezo" /><Button type="submit" loading={busy === "expense"} icon={<Plus />} className="w-full">Hifadhi Matumizi</Button></form></CardBody></Card>
          <Card><CardHeader title="Matumizi ya Karibuni" action={<span className="badge badge-wait">{money(data.stats.expenses)}</span>} /><CardBody className="!p-0">{data.expenses.length === 0 ? <Empty>Hakuna matumizi bado.</Empty> : <div className="divide-y divide-line">{data.expenses.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-ink">{expense.category}</p><p className="text-xs text-ink-3">{expense.note || "Bila maelezo"} · {date(expense.createdAt)}</p></div><p className="font-semibold text-danger">{money(expense.amount)}</p></div>)}</div>}</CardBody></Card>
        </div>
      )}

      {tab === "cargo" && <Card><CardHeader title="Mizigo Iliyofika Inayosubiri Stock" action={<span className="badge badge-info">{data.cargos.length}</span>} /><CardBody className="!p-0">{data.cargos.length === 0 ? <Empty>Hakuna mzigo unaosubiri kuingia stock.</Empty> : <div className="divide-y divide-line">{data.cargos.map((cargo) => <div key={cargo.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_220px_auto] lg:items-end"><div><p className="font-semibold text-ink">{cargo.supplier}</p><p className="mt-1 text-xs text-ink-3">{cargo.tracking || `Mzigo #${cargo.id}`} · {cargo.items.length} bidhaa · gharama {money(cargo.baseCost)}</p><p className="mt-2 text-sm text-ink-2">{cargo.items.map((item) => `${item.name} (${item.quantity})`).join(", ")}</p></div><Input label="Usafiri/kodi za ziada" type="number" min="0" value={extraCosts[cargo.id] ?? 0} onChange={(e) => setExtraCosts((current) => ({ ...current, [cargo.id]: Number(e.target.value) }))} /><Button loading={busy === `cargo-${cargo.id}`} icon={<PackageCheck />} onClick={async () => { setBusy(`cargo-${cargo.id}`); const result = await moveCargoToStockAction(cargo.id, extraCosts[cargo.id] ?? 0); setBusy(null); toast(result.message, result.success ? "success" : "error"); if (result.success) router.refresh(); }}>Ingiza Stock</Button></div>)}</div>}</CardBody></Card>}

      {tab === "team" && (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card><CardHeader title="Ongeza Mfanyakazi" /><CardBody><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitForm("staff", event.currentTarget, createStaffAction); }}><Input label="Jina la kuingia" name="jina" required /><Input label="Nenosiri la kuanzia" name="nenosiri" type="password" minLength={6} required /><Select label="Nafasi" name="business_role" required><option value="MANAGER">Meneja</option><option value="CASHIER">Cashier</option></Select><Button type="submit" loading={busy === "staff"} icon={<Plus />} className="w-full">Ongeza Mfanyakazi</Button></form></CardBody></Card>
          <Card><CardHeader title="Timu ya Duka" action={<span className="badge badge-info">{data.staff.length}</span>} /><CardBody className="!p-0">{data.staff.length === 0 ? <Empty>Hakuna mfanyakazi aliyeongezwa.</Empty> : <div className="divide-y divide-line">{data.staff.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold text-ink">{member.name}</p><p className="text-xs text-ink-3">{member.role === "MANAGER" ? "Meneja" : "Cashier"} · ameongezwa {date(member.createdAt)}</p></div><Button size="sm" variant={member.active ? "outline" : "success"} loading={busy === `staff-${member.id}`} onClick={async () => { setBusy(`staff-${member.id}`); const result = await toggleStaffAction(member.id); setBusy(null); toast(result.message, result.success ? "success" : "error"); if (result.success) router.refresh(); }}>{member.active ? "Zuia" : "Ruhusu"}</Button></div>)}</div>}</CardBody></Card>
        </div>
      )}

      {tab === "subscription" && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Card><CardHeader title="Subscription ya RexaBook" action={<span className={`badge ${subscriptionBadge}`}>{data.subscription.status}</span>} /><CardBody><div className="rounded-lg bg-primary/8 p-4"><p className="text-sm text-ink-3">Hali ya akaunti</p><p className="mt-1 text-xl font-semibold text-ink">{data.subscription.active ? "Inafanya kazi" : "Inahitaji malipo"}</p><p className="mt-1 text-sm text-ink-3">{data.subscription.endsAt ? `Inaisha ${date(data.subscription.endsAt)}` : "Hakuna tarehe ya mwisho"}</p></div><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void submitForm("subscription", event.currentTarget, startSubscriptionPaymentAction); }}><Select label="Mpango" name="miezi"><option value="1">Mwezi 1 · TZS 15,000</option><option value="12">Mwaka 1 · TZS 150,000</option></Select><Input label="Namba ya simu ya malipo" name="namba_malipo" type="tel" placeholder="0712345678" required /><Button type="submit" loading={busy === "subscription"} disabled={!data.snippeConfigured} icon={<Smartphone />} className="w-full">Lipa kwa Snippe</Button></form></CardBody></Card>
          <Card><CardHeader title="Historia ya Subscription" /><CardBody className="!p-0">{data.subscriptionPayments.length === 0 ? <Empty>Hakuna malipo ya subscription bado.</Empty> : <div className="divide-y divide-line">{data.subscriptionPayments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-ink">{payment.months === 12 ? "Mwaka mmoja" : "Mwezi mmoja"} · {money(payment.amount)}</p><p className="text-xs text-ink-3">{date(payment.createdAt)} · {payment.reference || "Haijapata reference"}</p></div><div className="flex items-center gap-2"><span className={`badge ${payment.status === "ACTIVE" ? "badge-done" : payment.status === "PENDING" ? "badge-wait" : "badge-danger"}`}>{payment.status}</span>{payment.status === "PENDING" && payment.reference && <Button size="sm" variant="outline" loading={busy === `sub-${payment.id}`} icon={<RefreshCw />} onClick={async () => { setBusy(`sub-${payment.id}`); const result = await checkSubscriptionPaymentAction(payment.id); setBusy(null); toast(result.message, result.success ? "success" : "error"); router.refresh(); }}>Kagua</Button>}</div></div>)}</div>}</CardBody></Card>
        </div>
      )}

      {tab === "audit" && <Card><CardHeader title="Historia ya Shughuli" action={<span className="badge badge-info">{data.audits.length}</span>} /><CardBody className="!p-0">{data.audits.length === 0 ? <Empty>Audit log itaanza kuonekana baada ya shughuli mpya.</Empty> : <div className="divide-y divide-line">{data.audits.map((audit) => <div key={audit.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[170px_1fr_auto] sm:items-center"><p className="text-sm font-semibold text-ink">{audit.actor}</p><div><p className="text-sm text-ink-2">{audit.action.replaceAll("_", " ")}</p><p className="text-xs text-ink-3">{audit.entity}</p></div><time className="text-xs text-ink-3">{date(audit.createdAt)}</time></div>)}</div>}</CardBody></Card>}
    </div>
  );
}
