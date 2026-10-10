"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, BadgeCheck, FileText, HandCoins, Landmark, Lock, MessageCircle, Minus, PackageSearch, Plus, ReceiptText, Search, ShoppingCart, Smartphone, Trash2, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createSaleAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK" | "CREDIT";

export interface SalesPanelProduct {
  id: number;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  stock: number;
}

export interface SalesPanelSale {
  id: number;
  receiptNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  servedBy: string | null;
  paymentMethod: string;
  paymentReference: string | null;
  total: number;
  createdAt: string;
}

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: LucideIcon }> = [
  { id: "CASH", label: "Taslimu", icon: Banknote },
  { id: "MOBILE_MONEY", label: "Simu", icon: Smartphone },
  { id: "BANK", label: "Benki", icon: Landmark },
  { id: "CREDIT", label: "Mkopo", icon: HandCoins },
];
const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((method) => [method.id, method.label]));

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

export function SalesPanel({
  products,
  customers,
  sales,
  locked,
  onPay,
}: {
  products: SalesPanelProduct[];
  customers: Array<{ id: number; jina: string; simu: string | null }>;
  sales: SalesPanelSale[];
  /** Subscription lapsed: the till is visible but nothing can be sold. */
  locked: boolean;
  /** Jumps to the Subscription tab; absent for accounts that never pay. */
  onPay?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Array<{ productId: number; quantity: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerId, setCustomerId] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [reference, setReference] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? products.filter((product) => product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle)) : products;
  }, [products, query]);
  const cartRows = useMemo(
    () => cart.flatMap((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return product ? [{ ...item, product }] : [];
    }),
    [cart, products]
  );
  const cartTotal = cartRows.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const cartUnits = cartRows.reduce((sum, item) => sum + item.quantity, 0);
  const inCart = (productId: number) => cart.find((item) => item.productId === productId)?.quantity ?? 0;
  const customerMatches = useMemo(() => {
    const needle = customerName.trim().toLowerCase();
    if (!needle || customerId) return [];
    return customers.filter((customer) => customer.jina.toLowerCase().includes(needle) || customer.simu?.includes(needle)).slice(0, 6);
  }, [customers, customerName, customerId]);
  const needsReference = paymentMethod === "MOBILE_MONEY";
  const missing = !customerName.trim()
    ? "Andika jina la mteja"
    : needsReference && reference.length < 4
      ? "Weka namba ya muamala"
      : paymentMethod === "CREDIT" && !customerId && !registerCustomer
        ? "Mkopo unahitaji mteja aliyesajiliwa"
        : null;

  function changeQuantity(product: SalesPanelProduct, delta: number) {
    setQuantity(product, inCart(product.id) + delta);
  }

  function setQuantity(product: SalesPanelProduct, requested: number) {
    const next = Number.isFinite(requested) ? Math.floor(requested) : 0;
    if (next > product.stock) {
      toast(`Stock ya ${product.name} haitoshi (zimebaki ${product.stock}).`, "error");
      return;
    }
    setCart((current) => {
      if (next <= 0) return current.filter((item) => item.productId !== product.id);
      return current.some((item) => item.productId === product.id)
        ? current.map((item) => (item.productId === product.id ? { ...item, quantity: next } : item))
        : [...current, { productId: product.id, quantity: next }];
    });
  }

  async function saveSale() {
    setBusy(true);
    const result = await createSaleAction({
      customerId: customerId || null,
      customerName,
      registerCustomer: !customerId && registerCustomer,
      customerPhone,
      paymentReference: needsReference ? reference : undefined,
      paymentMethod,
      paidAmount,
      items: cart,
    });
    setBusy(false);
    toast(result.message, result.success ? "success" : "error");
    if (!result.success) return;
    setCart([]);
    setPaidAmount(0);
    setCustomerId(0);
    setCustomerName("");
    setCustomerPhone("");
    setRegisterCustomer(false);
    setReference("");
    router.refresh();
    if (result.id) window.open(`/api/sales/${result.id}/receipt`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      {locked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-ink-2"><Lock className="size-4 shrink-0 text-danger" /> Subscription imeisha. Mauzo mapya yamefungwa; historia bado inaonekana.</p>
          {onPay && <Button size="sm" onClick={onPay}>Lipia sasa</Button>}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader title="Chagua Bidhaa" action={<span className="badge badge-info">{visibleProducts.length} bidhaa</span>} />
          <CardBody>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tafuta kwa jina au SKU"
                aria-label="Tafuta bidhaa"
                className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
            {visibleProducts.length === 0 ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-sm text-ink-3">
                <PackageSearch className="size-8" />
                {products.length === 0 ? "Hujaongeza bidhaa. Anza kwenye tab ya Bidhaa." : "Hakuna bidhaa inayolingana na ulichotafuta."}
              </div>
            ) : (
              <div className="grid max-h-[460px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product) => {
                  const quantity = inCart(product.id);
                  const soldOut = product.stock <= 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={locked || soldOut}
                      onClick={() => changeQuantity(product, 1)}
                      className={`relative rounded-lg border-2 bg-surface p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                        quantity > 0 ? "border-primary bg-primary/5" : "border-line enabled:hover:border-primary/40"
                      }`}
                    >
                      {quantity > 0 && <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{quantity}</span>}
                      <p className="truncate text-sm font-semibold text-ink">{product.name}</p>
                      <p className="mt-1 text-base font-semibold text-primary">{money(product.sellingPrice)}</p>
                      <p className={`mt-1 text-xs ${soldOut ? "font-semibold text-danger" : "text-ink-3"}`}>{soldOut ? "Imeisha stock" : `Stock ${product.stock.toLocaleString("en-TZ")} ${product.unit}`}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader title={<span className="flex items-center gap-2"><ShoppingCart className="size-4 text-primary" /> Kikapu</span>} action={<span className="badge badge-info">{cartUnits} pc</span>} />
          <CardBody className="space-y-4">
            {cartRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">Bonyeza bidhaa ili kuiongeza kwenye kikapu.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {cartRows.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{item.product.name}</p>
                      <p className="text-xs text-ink-3">{money(item.product.sellingPrice)} × {item.quantity} = <span className="font-semibold text-ink-2">{money(item.product.sellingPrice * item.quantity)}</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => changeQuantity(item.product, -1)} aria-label={`Punguza ${item.product.name}`} className="grid size-7 place-items-center rounded-md border border-line text-ink-2 hover:border-primary/40 hover:text-primary"><Minus className="size-3.5" /></button>
                      <input
                        type="number"
                        min="1"
                        max={item.product.stock}
                        value={item.quantity}
                        onChange={(event) => { if (event.target.value !== "") setQuantity(item.product, Math.max(1, Number(event.target.value))); }}
                        onFocus={(event) => event.currentTarget.select()}
                        aria-label={`Idadi ya ${item.product.name} (${item.product.unit})`}
                        className="h-7 w-14 rounded-md border border-line bg-surface text-center text-sm font-semibold text-ink outline-none focus:border-primary"
                      />
                      <button type="button" onClick={() => changeQuantity(item.product, 1)} aria-label={`Ongeza ${item.product.name}`} className="grid size-7 place-items-center rounded-md border border-line text-ink-2 hover:border-primary/40 hover:text-primary"><Plus className="size-3.5" /></button>
                      <button type="button" onClick={() => changeQuantity(item.product, -item.quantity)} aria-label={`Ondoa ${item.product.name}`} className="ml-1 grid size-7 place-items-center rounded-md text-ink-3 hover:bg-danger/10 hover:text-danger"><Trash2 className="size-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-ink-2">Njia ya malipo</p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    aria-pressed={paymentMethod === id}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-2.5 text-xs font-medium transition ${
                      paymentMethod === id ? "border-primary bg-primary/10 text-primary" : "border-line text-ink-2 hover:border-primary/40"
                    }`}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {needsReference && (
              <Input
                label="Namba ya muamala (ID ya SMS ya malipo)"
                value={reference}
                onChange={(event) => setReference(event.target.value.replace(/\s+/g, "").toUpperCase())}
                placeholder="mf. DJ45K8L2QX"
                maxLength={120}
                autoCapitalize="characters"
                autoComplete="off"
                className="uppercase tracking-wider"
                required
              />
            )}

            <div>
              <div className="relative">
              <Input
                label="Jina la mteja"
                value={customerName}
                onChange={(event) => { setCustomerName(event.target.value); setCustomerId(0); setSuggesting(true); }}
                onFocus={() => setSuggesting(true)}
                onBlur={() => setSuggesting(false)}
                placeholder="Andika jina au tafuta aliyesajiliwa"
                maxLength={100}
                autoComplete="off"
                required
              />
              {suggesting && customerMatches.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-card">
                  {customerMatches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        // mousedown fires before the input's blur closes the list
                        onMouseDown={(event) => { event.preventDefault(); setCustomerId(customer.id); setCustomerName(customer.jina); setRegisterCustomer(false); setSuggesting(false); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                      >
                        <UserRound className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{customer.jina}</span>
                        <span className="shrink-0 text-xs text-ink-3">{customer.simu || "Amesajiliwa"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              </div>
              {customerId > 0 ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-success"><BadgeCheck className="size-3.5" /> Mteja aliyesajiliwa</p>
              ) : customerName.trim() ? (
                <div className="mt-2 space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
                    <input type="checkbox" className="size-4 cursor-pointer rounded accent-primary" checked={registerCustomer} onChange={(event) => setRegisterCustomer(event.target.checked)} />
                    Msajili kama mteja mpya kwenye mfumo
                  </label>
                  {registerCustomer && <Input label="Simu ya mteja (hiari)" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="0712345678" maxLength={20} />}
                </div>
              ) : null}
            </div>
            {paymentMethod === "CREDIT" && (
              <Input label="Kiasi kilicholipwa sasa" type="number" min="0" max={cartTotal} value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
            )}

            <div className="rounded-lg bg-gradient-to-br from-primary to-info p-4 text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-white/75">Jumla ya kulipa</p>
              <p className="mt-1 text-3xl font-semibold">{money(cartTotal)}</p>
              {paymentMethod === "CREDIT" && cartTotal > 0 && <p className="mt-1 text-xs text-white/85">Deni litakalobaki: {money(Math.max(0, cartTotal - paidAmount))}</p>}
            </div>

            <Button onClick={() => void saveSale()} loading={busy} disabled={locked || cart.length === 0 || missing !== null} size="lg" icon={locked ? <Lock /> : <ReceiptText />} className="w-full">
              {locked ? "Mauzo yamefungwa" : "Kamilisha na Toa Risiti"}
            </Button>
            {!locked && cart.length > 0 && missing && <p className="text-center text-xs text-ink-3">{missing} ili kukamilisha.</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Historia ya Mauzo" action={<span className="badge badge-info">{sales.length}</span>} />
        <CardBody className="!p-0">
          {sales.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna mauzo bado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs uppercase text-ink-3">
                  <tr><th className="px-5 py-3">Risiti</th><th className="px-4 py-3">Mteja</th><th className="px-4 py-3">Malipo</th><th className="px-4 py-3 text-right">Jumla</th><th className="px-5 py-3 text-right">Tuma</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sales.map((sale) => {
                    const message = encodeURIComponent(`Habari ${sale.customerName || "mteja"}, risiti ${sale.receiptNumber}. Jumla ${money(sale.total)}. Asante.`);
                    const whatsappNumber = sale.customerPhone?.replace(/\D/g, "") || "";
                    return (
                      <tr key={sale.id} className="transition hover:bg-surface-2">
                        <td className="px-5 py-3"><p className="font-semibold text-ink">{sale.receiptNumber}</p><p className="text-xs text-ink-3">{date(sale.createdAt)} · {sale.servedBy || "Mfumo"}</p></td>
                        <td className="px-4 py-3 text-ink-2">{sale.customerName || "Mteja wa kawaida"}</td>
                        <td className="px-4 py-3"><span className="badge badge-info">{PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}</span>{sale.paymentReference ? <p className="mt-1 text-xs tracking-wider text-ink-3">{sale.paymentReference}</p> : null}</td>
                        <td className="px-4 py-3 text-right font-semibold text-ink">{money(sale.total)}</td>
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
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
