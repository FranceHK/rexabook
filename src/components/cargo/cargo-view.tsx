"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Package, CircleCheck, CircleDashed, Trash2, Search, Factory } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtPesa, fmtTarehe } from "@/lib/format";
import { useToast } from "@/components/theme/toast-provider";
import { CargoFormModal } from "@/components/cargo/cargo-form-modal";
import { CargoArriveModal } from "@/components/cargo/cargo-arrive-modal";
import { RisitiLightbox } from "@/components/cargo/risiti-lightbox";
import { deleteCargoAction } from "@/actions/cargo";

export interface CargoItemClient {
  id: number;
  jinaBidhaa: string;
  idadi: number;
  kitengo: string;
  beiKwaKipande: number;
  jumla: number;
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
  gari: "🚗",
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
  const [arriveTarget, setArriveTarget] = useState<CargoClient | null>(null);
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

  const stats = [
    { label: "Mizigo Yote", value: yote.toLocaleString("en-TZ"), icon: Package, tone: "text-primary" },
    { label: "Inayoendelea", value: haijafika.toLocaleString("en-TZ"), icon: CircleDashed, tone: "text-warning" },
    { label: "Imefika", value: imefika.toLocaleString("en-TZ"), icon: CircleCheck, tone: "text-success" },
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
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="panel flex items-center gap-4 p-4">
            <span className={`grid size-11 place-items-center rounded-2xl neu-inset ${tone}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-3">{label}</p>
              <p className="text-lg font-semibold text-ink">{value}</p>
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
            return (
              <div key={c.id} className={cn("panel relative overflow-hidden", !imefika && "hover:-translate-y-0.5 transition")}>
                {imefika && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-success to-emerald-400" aria-hidden />
                )}
                {!imefika && (
                  <button
                    type="button"
                    title="Bonyeza kuweka Imefika"
                    onClick={() => setArriveTarget(c)}
                    className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-surface-2 text-ink-3 transition hover:text-success"
                    aria-label="Weka Imefika"
                  >
                    <CircleDashed className="size-4" />
                  </button>
                )}

                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3 pr-6">
                    <div className="flex items-start gap-3">
                      {imefika ? (
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/12 text-success"><CircleCheck className="size-5" /></span>
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-warning/12 text-warning"><CircleDashed className="size-5" /></span>
                      )}
                      <div>
                        <p className="truncate text-[15px] font-semibold text-ink">{main}</p>
                        <p className="flex items-center gap-1 text-xs text-ink-3"><Factory className="size-3" /> {c.jinaKampuni}</p>
                      </div>
                    </div>
                    <span className={cn("badge", imefika ? "badge-done" : "badge-wait")}>
                      {imefika ? "Imefika" : "Haijafika"}
                    </span>
                  </div>

                  {/* Items table */}
                  <div className="mb-4 overflow-hidden rounded-xl border border-line">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[340px] text-left text-sm">
                      <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-ink-3">
                        <tr>
                          <th className="px-3 py-2 font-medium">Bidhaa</th>
                          <th className="px-3 py-2 font-medium">Idadi</th>
                          <th className="px-3 py-2 font-medium">Bei/pc</th>
                          <th className="px-3 py-2 text-right font-medium">Jumla</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.bidhaa.map((b) => (
                          <tr key={b.id} className="border-b border-line/60 last:border-0">
                            <td className="max-w-[120px] truncate px-3 py-2 text-ink-2">{b.jinaBidhaa}</td>
                            <td className="px-3 py-2 text-ink-2">{b.idadi} {b.kitengo}</td>
                            <td className="px-3 py-2 text-ink-2">{fmtPesa(b.beiKwaKipande)}</td>
                            <td className="px-3 py-2 text-right font-medium text-ink">{fmtPesa(b.jumla)}</td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
                    <span className="text-sm text-ink-3">Jumla ya Gharama Yote</span>
                    <span className="text-lg font-bold text-primary">{fmtPesa(c.jumlaGharama)}</span>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
                    <span>{icon} {c.ainaUsafiri ? c.ainaUsafiri.charAt(0).toUpperCase() + c.ainaUsafiri.slice(1) : "—"}</span>
                    <span>📅 Kuagiza: {fmtTarehe(c.tareheKuagiza)}</span>
                    {c.tareheKutarajiwa ? <span>🎯 Kutarajiwa: {fmtTarehe(c.tareheKutarajiwa)}</span> : null}
                    {imefika && c.tareheKufikaHalisi ? <span className="font-medium text-success">✅ Ilifika: {fmtTarehe(c.tareheKufikaHalisi)}</span> : null}
                  </div>

                  {c.nambariTracking ? (
                    <div className="mb-3 flex items-center gap-1.5 text-sm text-ink-2">
                      <Search className="size-3.5 text-ink-3" /> Tracking: <strong className="text-ink">{c.nambariTracking}</strong>
                    </div>
                  ) : null}

                  {c.maelezo ? <p className="mb-3 text-sm text-ink-2">💬 {c.maelezo}</p> : null}

                  {c.risitiPicha ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(c.risitiPicha!)}
                      className="mb-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2 transition hover:bg-surface-3"
                    >
                      🧾 Risiti ya Malipo
                      <img src={c.risitiPicha} alt="Risiti" className="ml-auto h-14 w-20 rounded-lg object-cover" />
                    </button>
                  ) : null}

                  <div className="flex items-center gap-3 border-t border-line pt-3">
                    {!imefika ? (
                      <button type="button" onClick={() => setArriveTarget(c)} className="btn btn-success btn-sm">
                        <CircleCheck className="size-4" /> Weka Imefika
                      </button>
                    ) : (
                      <span className="badge badge-done">✓ Imefika</span>
                    )}
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => futaMzigo(c)}
                      className="btn btn-danger btn-sm"
                      aria-label="Futa mzigo"
                    >
                      <Trash2 className="size-4" /> Futa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && <CargoFormModal onClose={() => setAddOpen(false)} />}
      {arriveTarget && <CargoArriveModal cargo={arriveTarget} onClose={() => setArriveTarget(null)} />}
      <RisitiLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}