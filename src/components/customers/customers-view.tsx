"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Users, Phone, MapPin, ChevronDown } from "lucide-react";
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

  const sortLabels: Record<SortKey, string> = {
    jina: "Jina (A-Z)",
    bakaa: "Imebaki Zaidi",
    jumla: "Deni Zaidi",
    mpya: "Wapya Kwanza",
  };

  const stats = [
    { label: "Wadaiwa wote", value: customers.length.toLocaleString("en-TZ") },
    { label: "Madeni yanayoendelea", value: customers.reduce((s, c) => s + c.deniInayoendelea, 0).toLocaleString("en-TZ") },
    { label: "Jumla imebaki", value: fmtPesa(totalBakaa) },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Wadaiwa</h1>
          <p className="mt-1 text-sm text-ink-3">Simamia wateja wako, madeni yao na malipo.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
          <Plus className="size-4" /> Mdaiwa Mpya
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="panel flex items-center gap-4 p-4">
            <span className="grid size-11 place-items-center rounded-2xl neu-inset text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-3">{s.label}</p>
              <p className="text-lg font-semibold text-ink">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[220px]">
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
            <div className="modal-box absolute right-0 top-full z-30 mt-2 w-44 p-1" onMouseLeave={() => setSortOpen(false)}>
              {(["jina", "bakaa", "jumla", "mpya"] as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setSort(k); setSortOpen(false); }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm transition",
                    sort === k ? "bg-primary/10 font-medium text-primary" : "text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {sortLabels[k]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="grid size-16 place-items-center rounded-full neu-inset text-ink-3">
            <Users className="size-7" />
          </div>
          {customers.length === 0 ? (
            <>
              <p className="text-sm text-ink-2">Hakuna wadaiwa bado. Anza kwa kumuongeza mdaiwa wa kwanza.</p>
              <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
                <Plus className="size-4" /> Mdaiwa Mpya
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-2">Hakuna mteja anayelingana na utafutaji wako.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const hasDebt = c.deniCount > 0;
            const pct = c.jumlaDeni > 0 ? Math.min(100, Math.round((c.jumlaLipwa / c.jumlaDeni) * 100)) : 0;
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="panel group relative overflow-hidden p-5 transition hover:-translate-y-0.5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full neu-inset text-lg font-bold text-primary">
                      {initial(c.jina)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink">{c.jina}</p>
                      <p className="text-xs text-ink-3">Tangu {fmtTarehe(c.tareheKuandikishwa)}</p>
                    </div>
                  </div>
                  {c.deniInayoendelea > 0 ? (
                    <span className="badge badge-wait">{c.deniInayoendelea} eneo</span>
                  ) : c.imekamilishaKikamilifu ? (
                    <span className="badge badge-done">Kamilifu</span>
                  ) : null}
                </div>

                <div className="mb-4 space-y-1.5 text-sm">
                  {c.simu ? (
                    <p className="flex items-center gap-2 text-ink-2"><Phone className="size-3.5 text-ink-3" /> {c.simu}</p>
                  ) : null}
                  {c.location ? (
                    <p className="flex items-center gap-2 text-ink-2"><MapPin className="size-3.5 text-ink-3" /> {c.location}</p>
                  ) : null}
                </div>

                <div className="rounded-xl bg-surface-2 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-3">Imebaki</span>
                    <span className={cn("font-semibold", c.bakaa === 0 ? "text-success" : "text-ink")}>
                      {fmtPesa(c.bakaa)}
                    </span>
                  </div>
                  {hasDebt ? (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, var(--primary), var(--success))",
                        }}
                      />
                    </div>
                  ) : null}
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