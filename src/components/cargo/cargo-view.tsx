"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Package,
  CircleCheck,
  CircleDashed,
  Trash2,
  Search,
  Factory,
  ReceiptText,
  MapPin,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtPesa, fmtTarehe } from "@/lib/format";
import { useToast } from "@/components/theme/toast-provider";
import { CargoFormModal } from "@/components/cargo/cargo-form-modal";
import { CargoRisitiModal } from "@/components/cargo/cargo-risiti-modal";
import { RisitiLightbox } from "@/components/cargo/risiti-lightbox";
import { deleteCargoAction, markCargoItemArrivedAction } from "@/actions/cargo";

export interface CargoItemClient {
  id: number;
  jinaBidhaa: string;
  idadi: number;
  kitengo: string;
  beiKwaKipande: number;
  jumla: number;
  imefika: boolean;
}

export interface CargoClient {
  id: number;
  jinaKampuni: string;
  jumlaGharama: number;
  ainaUsafiri?: string | null;
  nambariTracking?: string | null;
  tareheKuagiza: string;
  tareheKutarajiwa?: string | null;
  tareheKufikaHalisi?: string | null;
  hali: "Haijafika" | "Imefika";
  maelezo?: string | null;
  risitiPicha?: string | null;
  bidhaa: CargoItemClient[];
}

const USAFIRI_ICONS: Record<string, string> = {
  gari: "🚚",
  ndege: "✈️",
  bahari: "🚢",
  treni: "🚂",
  nyingine: "📦",
};

type Filter = "yote" | "Haijafika" | "Imefika";

export function CargoView({ cargos, clientNewOpen }: { cargos: CargoClient[]; clientNewOpen: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("yote");
  const [addOpen, setAddOpen] = useState(clientNewOpen);
  const [arrivingId, setArrivingId] = useState<number | null>(null);
  const [risitiTarget, setRisitiTarget] = useState<CargoClient | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const yote = cargos.length;
  const haijafika = cargos.filter((c) => c.hali === "Haijafika").length;
  const imefika = cargos.filter((c) => c.hali === "Imefika").length;

  const list = cargos.filter((c) => filter === "yote" || c.hali === filter);

  async function futaMzigo(c: CargoClient) {
    if (!window.confirm("Una uhakika unataka kufuta mzigo huu? Hatua hii haiwezi kurudishwa.")) return;
    const res = await deleteCargoAction(c.id);
    if (res.success) {
      toast(res.message);
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  }

  async function wekaImefika(b: CargoItemClient) {
    setArrivingId(b.id);
    const res = await markCargoItemArrivedAction(b.id);
    setArrivingId(null);
    if (res.success) {
      toast(res.message);
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  }

  const stats = [
    { label: "Mizigo Yote", value: yote.toLocaleString("en-TZ"), icon: Package, tone: "text-primary", grad: "from-primary" },
    { label: "Inayoendelea", value: haijafika.toLocaleString("en-TZ"), icon: CircleDashed, tone: "text-warning", grad: "from-warning" },
    { label: "Imefika", value: imefika.toLocaleString("en-TZ"), icon: CircleCheck, tone: "text-success", grad: "from-success" },
  ];

  const tabs: { key: Filter; label: string }[] = [
    { key: "yote", label: "Yote" },
    { key: "Haijafika", label: "⏳ Haijafika" },
    { key: "Imefika", label: "✅ Imefika" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Mizigo</h1>
          <p className="mt-1 text-sm text-ink-3">Fuatilia mizigo yako ya biashara kutoka kuagiza hadi kufika.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
          <Plus className="size-4" /> Mzigo Mpya
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone, grad }) => (
          <div key={label} className="panel relative overflow-hidden p-4">
            <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-transparent to-transparent opacity-70", grad)} />
            <div className="flex items-center gap-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl neu-inset ${tone}`}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs text-ink-3">{label}</p>
                <p className="text-lg font-semibold text-ink">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 rounded-xl bg-surface-2 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              filter === key ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full neu-inset text-ink-3">
            <Package className="size-7" />
          </span>
          {cargos.length === 0 ? (
            <>
              <p className="text-sm text-ink-2">Hakuna mizigo iliyoandikwa bado.</p>
              <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
                <Plus className="size-4" /> Ongeza Mzigo wa Kwanza
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-2">Hakuna mizigo katika hali hii.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((c) => {
            const main = c.bidhaa[0]?.jinaBidhaa ?? "Biz nyingi";
            const icon = USAFIRI_ICONS[c.ainaUsafiri?.toLowerCase() ?? ""] ?? "📦";
            const imefika = c.hali === "Imefika";
            const imelipwa = Boolean(c.risitiPicha);
            const jumlaBidhaa = c.bidhaa.length;
            const imefikaBidhaa = c.bidhaa.filter((b) => b.imefika || imefika).length;
            const zoteZimefika = jumlaBidhaa > 0 && imefikaBidhaa === jumlaBidhaa;
            return (
              <div
                key={c.id}
                className={cn("panel relative overflow-hidden", !imefika && "hover:-translate-y-0.5 transition")}
              >
                {/* Top accent stripe */}
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-1.5",
                    imefika
                      ? "bg-gradient-to-r from-success via-emerald-400 to-teal-300"
                      : "bg-gradient-to-r from-warning via-amber-400 to-orange-300"
                  )}
                  aria-hidden
                />

                <div className="p-5">
                  {/* Header row */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {imefika ? (
                        <span className="anim-pop grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-success/15 to-emerald-300/15 text-success">
                          <CircleCheck className="size-6" />
                        </span>
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-warning/15 to-amber-300/15 text-warning">
                          <CircleDashed className="size-6" />
                        </span>
                      )}
                      <div>
                        <p className="truncate text-[15px] font-semibold text-ink">{main}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                          <Factory className="size-3" /> {c.jinaKampuni}
                        </p>
                        {c.nambariTracking ? (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                            <Search className="size-3 text-ink-3" /> Tracking: <strong className="text-ink">{c.nambariTracking}</strong>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={cn("badge", zoteZimefika ? "badge-done" : "badge-danger")}>
                        {zoteZimefika ? `✓ Imefika ${imefikaBidhaa}/${jumlaBidhaa}` : `⏳ Imefika ${imefikaBidhaa}/${jumlaBidhaa}`}
                      </span>
                      {imelipwa ? (
                        <span className="badge badge-done">💳 Imelipwa</span>
                      ) : (
                        <span className="badge badge-wait">Inadaiwa</span>
                      )}
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="mb-4 overflow-hidden rounded-2xl border border-line">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] text-left text-sm">
                        <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-ink-3">
                          <tr>
                            <th className="px-3 py-2 font-medium">Bidhaa</th>
                            <th className="px-3 py-2 font-medium">Idadi</th>
                            <th className="px-3 py-2 font-medium">Bei/pc</th>
                            <th className="px-3 py-2 text-right font-medium">Jumla</th>
                            <th className="px-3 py-2 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bidhaa.map((b) => {
                            const rowImefika = b.imefika || imefika;
                            const rowBusy = arrivingId === b.id;
                            return (
                              <tr
                                key={b.id}
                                className={cn(
                                  "border-b border-line/60 last:border-0 transition-colors",
                                  rowImefika
                                    ? "bg-success/5 hover:bg-success/10"
                                    : "bg-danger/5 hover:bg-danger/10"
                                )}
                              >
                                <td className="max-w-[130px] truncate px-3 py-2 font-medium text-ink-2">{b.jinaBidhaa}</td>
                                <td className="px-3 py-2 text-ink-2">
                                  {b.idadi} <span className="text-ink-3">{b.kitengo}</span>
                                </td>
                                <td className="px-3 py-2 text-ink-2">{fmtPesa(b.beiKwaKipande)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-ink">{fmtPesa(b.jumla)}</td>
                                <td className="px-3 py-2 text-right">
                                  {rowImefika ? (
                                    <span className="badge badge-done">✓ Imefika</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => wekaImefika(b)}
                                      disabled={rowBusy}
                                      className="btn btn-success btn-sm !px-2.5 !py-1 text-xs"
                                    >
                                      {rowBusy ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      ) : (
                                        <CircleCheck className="size-3.5" />
                                      )}{" "}
                                      Imefika
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gradient-to-r from-primary/8 to-primary-2/8">
                            <td colSpan={4} className="px-3 py-2.5 text-sm font-medium text-ink-2">Jumla ya Gharama Yote</td>
                            <td className="px-3 py-2.5 text-right text-base font-bold text-primary">{fmtPesa(c.jumlaGharama)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {icon} {c.ainaUsafiri ? c.ainaUsafiri.charAt(0).toUpperCase() + c.ainaUsafiri.slice(1) : "—"}
                    </span>
                    {c.tareheKutarajiwa ? <span>🎯 Kutarajiwa: {fmtTarehe(c.tareheKutarajiwa)}</span> : null}
                    {imefika && c.tareheKufikaHalisi ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <CircleCheck className="size-3.5" /> Ilifika: {fmtTarehe(c.tareheKufikaHalisi)}
                      </span>
                    ) : null}
                  </div>

                  {c.maelezo ? <p className="mb-3 text-sm text-ink-2">💬 {c.maelezo}</p> : null}

                  {c.risitiPicha ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(c.risitiPicha!)}
                      className="mb-3 flex w-full items-center gap-2 rounded-xl bg-success/8 px-3 py-2 text-sm text-success transition hover:bg-success/15"
                    >
                      <ReceiptText className="size-4" /> Risiti ya Malipo
                      <Image src={c.risitiPicha} alt="Risiti" width={64} height={48} unoptimized className="ml-auto h-12 w-16 rounded-lg object-cover ring-1 ring-line" />
                    </button>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    {!imelipwa ? (
                      <button type="button" onClick={() => setRisitiTarget(c)} className="btn btn-secondary">
                        <ReceiptText className="size-4" /> Weka Risiti
                      </button>
                    ) : null}

                    <div className="flex-1" />

                    {!imefika && (
                      <button
                        type="button"
                        onClick={() => futaMzigo(c)}
                        className="btn btn-danger btn-sm"
                        aria-label="Futa mzigo"
                      >
                        <Trash2 className="size-4" /> Futa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && <CargoFormModal onClose={() => setAddOpen(false)} />}
      {risitiTarget && <CargoRisitiModal cargo={risitiTarget} onClose={() => setRisitiTarget(null)} />}
      <RisitiLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
