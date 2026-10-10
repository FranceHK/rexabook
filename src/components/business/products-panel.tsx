"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Boxes, Minus, PackagePlus, PackageSearch, Pencil, Plus, Save, Search, Wallet } from "lucide-react";
import { adjustProductStockAction, createProductAction, updateProductAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/theme/toast-provider";

export interface ProductsPanelProduct {
  id: number;
  name: string;
  sku: string;
  unit: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockAt: number;
}

type StockMode = "add" | "remove";

const STOCK_REASONS: Record<StockMode, string[]> = {
  add: ["Manunuzi mapya", "Bidhaa zilizorudishwa", "Marekebisho ya hesabu"],
  remove: ["Zimeharibika", "Zimepotea", "Matumizi ya duka", "Marekebisho ya hesabu"],
};

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;

function stockTone(product: ProductsPanelProduct): { badge: string; label: string } {
  if (product.stock <= 0) return { badge: "badge-danger", label: "Imeisha" };
  if (product.stock <= product.lowStockAt) return { badge: "badge-wait", label: "Ndogo" };
  return { badge: "badge-done", label: "Ipo" };
}

export function ProductsPanel({ products, locked }: { products: ProductsPanelProduct[]; locked: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductsPanelProduct | null>(null);
  const [stocking, setStocking] = useState<ProductsPanelProduct | null>(null);
  const [stockMode, setStockMode] = useState<StockMode>("add");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState(STOCK_REASONS.add[0]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? products.filter((product) => product.name.toLowerCase().includes(needle) || product.sku.toLowerCase().includes(needle)) : products;
  }, [products, query]);
  const stockValue = products.reduce((sum, product) => sum + product.stock * product.buyingPrice, 0);
  const lowCount = products.filter((product) => product.stock <= product.lowStockAt).length;

  async function finish(key: string, action: () => Promise<{ success: boolean; message: string }>): Promise<boolean> {
    setBusy(key);
    const result = await action();
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
    return result.success;
  }

  function openStock(product: ProductsPanelProduct, mode: StockMode) {
    setStocking(product);
    setStockMode(mode);
    setStockQuantity(1);
    setStockReason(STOCK_REASONS[mode][0]);
  }

  const stockAfter = stocking ? stocking.stock + (stockMode === "add" ? stockQuantity : -stockQuantity) : 0;
  const stockInvalid = !Number.isSafeInteger(stockQuantity) || stockQuantity < 1 || stockAfter < 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        {([
          ["Bidhaa zote", products.length.toLocaleString("en-TZ"), Boxes, "bg-primary/10 text-primary"],
          ["Thamani ya stock", money(stockValue), Wallet, "bg-primary-2/10 text-primary-2"],
          ["Stock ndogo au imeisha", lowCount.toLocaleString("en-TZ"), AlertTriangle, lowCount ? "bg-danger/10 text-danger" : "bg-success/10 text-success"],
        ] as const).map(([label, value, Icon, tone]) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 shadow-card">
            <div><p className="text-xs font-medium uppercase text-ink-3">{label}</p><p className="mt-2 text-xl font-semibold text-ink">{value}</p></div>
            <span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary-2 px-5 py-4 text-white">
            <p className="flex items-center gap-2 text-base font-semibold"><PackagePlus className="size-5" /> Ongeza Bidhaa</p>
            <p className="mt-1 text-xs text-white/85">SKU inatengenezwa yenyewe kutokana na jina.</p>
          </div>
          <CardBody>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void finish("create", () => createProductAction(null, new FormData(form))).then((created) => { if (created) form.reset(); });
              }}
            >
              <Input label="Jina la bidhaa" name="jina" placeholder="mf. Sukari 1kg" maxLength={150} required />
              <Input label="Kitengo (mf. pc, kg, box)" name="kitengo" defaultValue="pc" maxLength={30} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bei ya kununua" name="bei_kununua" type="number" min="0" defaultValue="0" required />
                <Input label="Bei ya kuuza" name="bei_kuuza" type="number" min="0" defaultValue="0" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Stock ya kuanzia" name="stock" type="number" min="0" defaultValue="0" required />
                <Input label="Tahadhari ikifika" name="stock_tahadhari" type="number" min="0" defaultValue="5" required />
              </div>
              <Button type="submit" loading={busy === "create"} disabled={locked} icon={<Plus />} className="w-full">Ongeza Bidhaa</Button>
              {locked && <p className="text-center text-xs text-danger">Subscription imeisha. Kuongeza bidhaa kumefungwa.</p>}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Bidhaa na Stock" action={<span className="badge badge-info">{visible.length} bidhaa</span>} />
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

            {visible.length === 0 ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-sm text-ink-3">
                <PackageSearch className="size-8" />
                {products.length === 0 ? "Ongeza bidhaa yako ya kwanza." : "Hakuna bidhaa inayolingana na ulichotafuta."}
              </div>
            ) : (
              <ul className="space-y-3">
                {visible.map((product) => {
                  const tone = stockTone(product);
                  const margin = product.sellingPrice - product.buyingPrice;
                  return (
                    <li key={product.id} className="rounded-lg border border-line bg-surface p-4 transition hover:border-primary/30">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{product.name}</p>
                          <p className="text-xs text-ink-3">{product.sku} · kitengo: {product.unit}</p>
                        </div>
                        <Button size="sm" variant="outline" icon={<Pencil />} disabled={locked} onClick={() => setEditing(product)}>Hariri</Button>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div><p className="text-xs text-ink-3">Bei ya kununua</p><p className="font-semibold text-ink">{money(product.buyingPrice)}</p></div>
                        <div><p className="text-xs text-ink-3">Bei ya kuuza</p><p className="font-semibold text-primary">{money(product.sellingPrice)}</p></div>
                        <div><p className="text-xs text-ink-3">Faida kwa kimoja</p><p className={`font-semibold ${margin >= 0 ? "text-success" : "text-danger"}`}>{money(margin)}</p></div>
                      </div>

                      {/* Stock has its own controls: editing a product never changes the count. */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs text-ink-3">Stock iliyopo</p>
                            <p className="text-lg font-semibold leading-tight text-ink">{product.stock.toLocaleString("en-TZ")} <span className="text-xs font-normal text-ink-3">{product.unit}</span></p>
                          </div>
                          <span className={`badge ${tone.badge}`}>{tone.label}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" icon={<Minus />} disabled={locked || product.stock <= 0} onClick={() => openStock(product, "remove")}>Punguza</Button>
                          <Button size="sm" icon={<Plus />} disabled={locked} onClick={() => openStock(product, "add")}>Ongeza stock</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Hariri Bidhaa" subtitle={editing ? `${editing.sku} · stock haibadiliki hapa` : undefined}>
        {editing && (
          <form
            key={editing.id}
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void finish("edit", () => updateProductAction(editing.id, new FormData(form))).then((saved) => { if (saved) setEditing(null); });
            }}
          >
            <Input label="Jina la bidhaa" name="jina" defaultValue={editing.name} maxLength={150} required />
            <Input label="Kitengo" name="kitengo" defaultValue={editing.unit} maxLength={30} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bei ya kununua" name="bei_kununua" type="number" min="0" defaultValue={editing.buyingPrice} required />
              <Input label="Bei ya kuuza" name="bei_kuuza" type="number" min="0" defaultValue={editing.sellingPrice} required />
            </div>
            <Input label="Tahadhari stock ikifika" name="stock_tahadhari" type="number" min="0" defaultValue={editing.lowStockAt} required />
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-3">Stock iliyopo ni {editing.stock.toLocaleString("en-TZ")} {editing.unit}. Kuibadilisha tumia vitufe vya “Ongeza stock” au “Punguza”.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Ghairi</Button>
              <Button type="submit" loading={busy === "edit"} icon={<Save />}>Hifadhi</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={stocking !== null} onClose={() => setStocking(null)} title={stockMode === "add" ? "Ongeza Stock" : "Punguza Stock"} subtitle={stocking?.name}>
        {stocking && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (stockInvalid) return;
              const delta = stockMode === "add" ? stockQuantity : -stockQuantity;
              void finish("stock", () => adjustProductStockAction(stocking.id, delta, stockReason)).then((saved) => { if (saved) setStocking(null); });
            }}
          >
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1">
              {(["add", "remove"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setStockMode(mode); setStockReason(STOCK_REASONS[mode][0]); }}
                  aria-pressed={stockMode === mode}
                  className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${stockMode === mode ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"}`}
                >
                  {mode === "add" ? <Plus className="size-4" /> : <Minus className="size-4" />} {mode === "add" ? "Ongeza" : "Punguza"}
                </button>
              ))}
            </div>

            <Input label={`Idadi ya ${stockMode === "add" ? "kuongeza" : "kupunguza"} (${stocking.unit})`} type="number" min="1" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(Number(event.target.value))} required autoFocus />
            <Select label="Sababu" value={stockReason} onChange={(event) => setStockReason(event.target.value)}>
              {STOCK_REASONS[stockMode].map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </Select>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-3 text-center">
              <div><p className="text-xs text-ink-3">Stock ya sasa</p><p className="text-xl font-semibold text-ink">{stocking.stock.toLocaleString("en-TZ")}</p></div>
              <div><p className="text-xs text-ink-3">Itakuwa</p><p className={`text-xl font-semibold ${stockAfter < 0 ? "text-danger" : "text-primary"}`}>{Number.isFinite(stockAfter) ? stockAfter.toLocaleString("en-TZ") : "-"}</p></div>
            </div>
            {stockAfter < 0 && <p className="text-sm text-danger">Huwezi kupunguza zaidi ya stock iliyopo.</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStocking(null)}>Ghairi</Button>
              <Button type="submit" loading={busy === "stock"} disabled={stockInvalid} icon={<Save />}>Hifadhi</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
