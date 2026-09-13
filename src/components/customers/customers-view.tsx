"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Users, Phone, MapPin, ChevronDown, Wallet, TrendingUp, UserPlus, Clock } from "lucide-react";
import { fmtPesa, fmtTarehe, initial } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/theme/toast-provider";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";

export interface CustomerCardData {
  id: number;
  jina: string;
  simu?: string | null;
  location?: string | null;
  tareheKuandikishwa: Date;
  jumlaDeni: number;
  jumlaLipwa: number;
  bakaa: number;
  deniCount: number;
  deniInayoendelea: number;
  imekamilishaKikamilifu: boolean;
}

type SortKey = "jina" | "bakaa" | "jumla" | "mpya";

export function CustomersView({
  customers,
  clientNewOpen,
}: {
  customers: CustomerCardData[];
  clientNewOpen: boolean;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("jina");
  const [addOpen, setAddOpen] = useState(clientNewOpen);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (!q) return true;
      return (
        c.jina.toLowerCase().includes(q) ||
        (c.simu ?? "").toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q)
      );
    });
    switch (sort) {
      case "bakaa":
        return [...list].sort((a, b) => b.bakaa - a.bakaa);
      case "jumla":
        return [...list].sort((a, b) => b.jumlaDeni - a.jumlaDeni);
      case "mpya":
        return [...list].sort((a, b) => b.tareheKuandikishwa.getTime() - a.tareheKuandikishwa.getTime());
      default:
        return [...list].sort((a, b) => a.jina.localeCompare(b.jina));
    }
  }, [customers, query, sort]);

  const totalBakaa = customers.reduce((s, c) => s + c.bakaa, 0);
  const totalMadeni = customers.reduce((s, c) => s + c.jumlaDeni, 0);

  const sortLabels: Record<SortKey, string> = {
    jina: "Jina (A-Z)",
    bakaa: "Imebaki Zaidi",
    jumla: "Deni Zaidi",
    mpya: "Wapya Kwanza",
  };

  const sortOpts: SortKey[] = ["jina", "bakaa", "jumla", "mpya"];

  const stats = [
    { label: "Wadaiwa", value: customers.length, icon: Users, accent: "--primary" },
    { label: "Deni Lote", value: fmtPesa(totalMadeni), icon: Wallet, accent: "--info" },
    { label: "Imebaki", value: fmtPesa(totalBakaa), icon: TrendingUp, accent: "--warning" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Wadaiwa</h1>
          <p className="mt-1 text-sm text-ink-3">Simamia wateja wako, madeni yao na malipo.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary shadow-lg shadow-primary/20">
          <Plus className="size-4" /> Mdaiwa Mpya
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="panel group relative overflow-hidden p-4 transition hover:shadow-glass sm:p-5">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: `var(${accent})` }} />
            <div className="flex items-center gap-4">
              <div
                className="grid size-12 shrink-0 place-items-center rounded-2xl transition group-hover:scale-105"
                style={{ background: `color-mix(in srgb, var(${accent}) 14%, transparent)`, color: `var(${accent})` }}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
                <p className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tafuta kwa jina, simu, au makazi..."
            className="field !pl-9"
            aria-label="Tafuta wadaiwa"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="btn btn-secondary btn-sm"
          >
            {sortLabels[sort]} <ChevronDown className="size-4" />
          </button>
          {sortOpen && (
            <div className="modal-box absolute right-0 top-full z-30 mt-2 w-48 p-1 shadow-xl" onMouseLeave={() => setSortOpen(false)}>
              {sortOpts.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setSort(k); setSortOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
                    sort === k ? "bg-primary/10 font-medium text-primary" : "text-ink-2 hover:bg-surface-2"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", sort === k ? "bg-primary" : "bg-ink-3/40")} />
                  {sortLabels[k]}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="hidden text-xs text-ink-3 sm:block">{filtered.length} matokeo</span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-5 px-6 py-20 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-surface-2 text-ink-3">
            <Users className="size-8" />
          </div>
          {customers.length === 0 ? (
            <>
              <div>
                <p className="text-base font-medium text-ink">Hakuna wadaiwa bado</p>
                <p className="mt-1 text-sm text-ink-3">Anza kwa kumuongeza mdaiwa wa kwanza kwenye mfumo wako.</p>
              </div>
              <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
                <UserPlus className="size-4" /> Ongeza Mdaiwa
              </button>
            </>
          ) : (
            <div>
              <p className="text-base font-medium text-ink">Hakuna mteja anayelingana</p>
              <p className="mt-1 text-sm text-ink-3">Badilisha maneno ya utafutaji na jaribu tena.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const hasDebt = c.deniInayoendelea > 0;
            const pct = c.jumlaDeni > 0 ? Math.min(100, Math.round((c.jumlaLipwa / c.jumlaDeni) * 100)) : 0;
            const accent = c.imekamilishaKikamilifu ? "--success" : hasDebt ? "--primary" : "--info";

            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="panel group relative overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-glass"
              >
                {/* Colored accent bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, var(${accent}), color-mix(in srgb, var(${accent}) 60%, var(--info)))` }} />

                <div className="px-5 pt-4 pb-5">
                  {/* Name + status */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, var(${accent}), color-mix(in srgb, var(--info) 80%, var(${accent})))` }}
                      >
                        {initial(c.jina)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-ink">{c.jina}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                          <Clock className="size-3" /> Tangu {fmtTarehe(c.tareheKuandikishwa)}
                        </p>
                      </div>
                    </div>
                    {hasDebt ? (
                      <span className="badge badge-wait shrink-0">{c.deniInayoendelea} deni</span>
                    ) : c.imekamilishaKikamilifu ? (
                      <span className="badge badge-done shrink-0">Kamilifu</span>
                    ) : null}
                  </div>

                  {/* Contact info */}
                  {(c.simu || c.location) ? (
                    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2">
                      {c.simu ? (
                        <span className="flex items-center gap-1.5"><Phone className="size-3 text-ink-3" /> {c.simu}</span>
                      ) : null}
                      {c.location ? (
                        <span className="flex items-center gap-1.5"><MapPin className="size-3 text-ink-3" /> {c.location}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Amount box */}
                  <div className="rounded-xl bg-surface-2 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-3">Imebaki</span>
                      <span className={cn("text-lg font-bold", c.bakaa === 0 ? "text-success" : "text-ink")}>
                        {fmtPesa(c.bakaa)}
                      </span>
                    </div>
                    {hasDebt ? (
                      <div className="mt-2.5">
                        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full transition-[width] duration-600"
                            style={{
                              width: `${pct}%`,
                              background: "linear-gradient(90deg, var(--primary), var(--success))",
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-right text-[11px] text-ink-3">{pct}% imelipwa</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-center text-xs font-medium text-success">Limelipwa kikamilifu</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CustomerFormModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={(msg) => toast(msg)} />
    </div>
  );
}
