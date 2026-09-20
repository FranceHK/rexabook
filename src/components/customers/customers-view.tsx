"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Users,
  Phone,
  MapPin,
  ChevronDown,
  Wallet,
  UserPlus,
  Clock,
  LayoutGrid,
  List,
  CircleCheckBig,
  CircleDollarSign,
  ArrowUpRight,
  Ban,
  RotateCcw,
} from "lucide-react";
import { fmtPesa, fmtTarehe, initial } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/theme/toast-provider";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { setCustomerBlockedAction } from "@/actions/customers";

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
  imezuiwa: boolean;
}

type SortKey = "jina" | "bakaa" | "jumla" | "mpya";
type ViewMode = "grid" | "list";

export function CustomersView({
  customers,
  clientNewOpen,
}: {
  customers: CustomerCardData[];
  clientNewOpen: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("jina");
  const [addOpen, setAddOpen] = useState(clientNewOpen);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showBlocked, setShowBlocked] = useState(false);
  const [changingCustomerId, setChangingCustomerId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (c.imezuiwa !== showBlocked) return false;
      if (!q) return true;
      return (
        c.jina.toLowerCase().includes(q) ||
        (c.simu ?? "").toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      const debtPriority = Number(b.deniInayoendelea > 0) - Number(a.deniInayoendelea > 0);
      if (debtPriority !== 0) return debtPriority;

      switch (sort) {
        case "bakaa":
          return b.bakaa - a.bakaa;
        case "jumla":
          return b.jumlaDeni - a.jumlaDeni;
        case "mpya":
          return b.tareheKuandikishwa.getTime() - a.tareheKuandikishwa.getTime();
        default:
          return a.jina.localeCompare(b.jina);
      }
    });
  }, [customers, query, showBlocked, sort]);

  const visibleCustomers = customers.filter((c) => !c.imezuiwa);
  const blockedCount = customers.length - visibleCustomers.length;
  const totalBakaa = visibleCustomers.reduce((s, c) => s + c.bakaa, 0);
  const activeCustomers = filtered.filter((c) => c.deniInayoendelea > 0);
  const settledCustomers = filtered.filter((c) => c.deniInayoendelea === 0);
  const activeCount = visibleCustomers.filter((c) => c.deniInayoendelea > 0).length;
  const settledCount = visibleCustomers.length - activeCount;

  const sortLabels: Record<SortKey, string> = {
    jina: "Jina (A-Z)",
    bakaa: "Imebaki Zaidi",
    jumla: "Deni Zaidi",
    mpya: "Wapya Kwanza",
  };

  const sortOpts: SortKey[] = ["jina", "bakaa", "jumla", "mpya"];

  const stats = [
    { label: "Wateja wote", value: visibleCustomers.length, icon: Users, accent: "--primary" },
    { label: "Wenye deni", value: activeCount, icon: CircleDollarSign, accent: "--warning" },
    { label: "Deni lililobaki", value: fmtPesa(totalBakaa), icon: Wallet, accent: "--info" },
    { label: "Hawadaiwi", value: settledCount, icon: CircleCheckBig, accent: "--success" },
  ];

  function toggleBlocked(customer: CustomerCardData) {
    const nextBlocked = !customer.imezuiwa;
    if (nextBlocked && !window.confirm(`Mzuie ${customer.jina}? Atafichwa kwenye orodha ya kawaida.`)) return;

    setChangingCustomerId(customer.id);
    startTransition(async () => {
      const result = await setCustomerBlockedAction(customer.id, nextBlocked);
      setChangingCustomerId(null);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) router.refresh();
    });
  }

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
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="panel group p-4 transition hover:border-primary/20 hover:shadow-sm sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="grid size-10 shrink-0 place-items-center rounded-lg transition group-hover:scale-105 sm:size-11"
                style={{ background: `color-mix(in srgb, var(${accent}) 14%, transparent)`, color: `var(${accent})` }}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink-3">{label}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-ink sm:text-xl">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="panel mb-7 flex flex-wrap items-center gap-3 p-3">
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
        <div className="flex items-center rounded-lg border border-line bg-surface-2 p-1" aria-label="Badilisha muonekano">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "grid size-8 place-items-center rounded-md transition",
              viewMode === "grid" ? "bg-surface text-primary shadow-sm" : "text-ink-3 hover:text-ink"
            )}
            aria-label="Muonekano wa grid"
            title="Grid"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "grid size-8 place-items-center rounded-md transition",
              viewMode === "list" ? "bg-surface text-primary shadow-sm" : "text-ink-3 hover:text-ink"
            )}
            aria-label="Muonekano wa list"
            title="List"
          >
            <List className="size-4" />
          </button>
        </div>
        {blockedCount > 0 || showBlocked ? (
          <button
            type="button"
            onClick={() => { setShowBlocked((value) => !value); setQuery(""); }}
            className={cn("btn btn-sm", showBlocked ? "btn-primary" : "btn-secondary")}
          >
            <Ban className="size-4" /> {showBlocked ? "Rudi kwa wadaiwa" : `Waliozuiwa (${blockedCount})`}
          </button>
        ) : null}
        <span className="hidden text-xs text-ink-3 sm:block">{filtered.length} matokeo</span>
      </div>

      {/* Customers */}
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
          ) : showBlocked ? (
            <div>
              <p className="text-base font-medium text-ink">Hakuna waliozuiwa</p>
              <p className="mt-1 text-sm text-ink-3">Wateja utakaozuia wataonekana hapa.</p>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium text-ink">Hakuna mteja anayelingana</p>
              <p className="mt-1 text-sm text-ink-3">Badilisha maneno ya utafutaji na jaribu tena.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-9">
          {!showBlocked && activeCustomers.length > 0 ? (
            <CustomerSection
              title="Wenye madeni"
              subtitle="Wateja wenye salio la kulipwa"
              customers={activeCustomers}
              viewMode={viewMode}
              tone="debt"
              onToggleBlocked={toggleBlocked}
              changingCustomerId={isPending ? changingCustomerId : null}
            />
          ) : null}
          {!showBlocked && settledCustomers.length > 0 ? (
            <CustomerSection
              title="Hawadaiwi"
              subtitle="Waliomaliza malipo au wasio na deni"
              customers={settledCustomers}
              viewMode={viewMode}
              tone="settled"
              onToggleBlocked={toggleBlocked}
              changingCustomerId={isPending ? changingCustomerId : null}
            />
          ) : null}
          {showBlocked && filtered.length > 0 ? (
            <CustomerSection
              title="Waliozuiwa"
              subtitle="Hawa hawaonekani kwenye orodha ya kawaida"
              customers={filtered}
              viewMode={viewMode}
              tone="blocked"
              onToggleBlocked={toggleBlocked}
              changingCustomerId={isPending ? changingCustomerId : null}
            />
          ) : null}
        </div>
      )}

      <CustomerFormModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={(msg) => toast(msg)} />
    </div>
  );
}

function CustomerSection({
  title,
  subtitle,
  customers,
  viewMode,
  tone,
  onToggleBlocked,
  changingCustomerId,
}: {
  title: string;
  subtitle: string;
  customers: CustomerCardData[];
  viewMode: ViewMode;
  tone: "debt" | "settled" | "blocked";
  onToggleBlocked: (customer: CustomerCardData) => void;
  changingCustomerId: number | null;
}) {
  const Icon = tone === "debt" ? CircleDollarSign : tone === "settled" ? CircleCheckBig : Ban;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-9 place-items-center rounded-lg", tone === "debt" ? "bg-warning/10 text-warning" : tone === "settled" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
            <Icon className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="text-xs text-ink-3">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2">{customers.length}</span>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <CustomerGridCard
              key={customer.id}
              customer={customer}
              onToggleBlocked={onToggleBlocked}
              changing={changingCustomerId === customer.id}
            />
          ))}
        </div>
      ) : (
        <div className="panel divide-y divide-line/70 overflow-hidden p-0">
          {customers.map((customer) => (
            <CustomerListRow
              key={customer.id}
              customer={customer}
              onToggleBlocked={onToggleBlocked}
              changing={changingCustomerId === customer.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CustomerGridCard({
  customer: c,
  onToggleBlocked,
  changing,
}: {
  customer: CustomerCardData;
  onToggleBlocked: (customer: CustomerCardData) => void;
  changing: boolean;
}) {
  const hasDebt = c.deniInayoendelea > 0;
  const pct = c.jumlaDeni > 0 ? Math.min(100, Math.round((c.jumlaLipwa / c.jumlaDeni) * 100)) : 0;

  return (
    <article className={cn("panel overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-glass", c.imezuiwa && "opacity-75")}>
      <Link href={`/customers/${c.id}`} className="group flex min-h-[230px] flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-sm font-bold", hasDebt ? "bg-primary/10 text-primary" : "bg-success/10 text-success")}>
            {initial(c.jina)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink group-hover:text-primary">{c.jina}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
              <Clock className="size-3" /> Tangu {fmtTarehe(c.tareheKuandikishwa)}
            </p>
          </div>
        </div>
        <span className={cn("badge shrink-0", hasDebt ? "badge-wait" : "badge-done")}>
          {hasDebt ? `${c.deniInayoendelea} deni` : "Hadaiwi"}
        </span>
      </div>

      <div className="mt-4 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
        {c.simu ? <span className="flex items-center gap-1.5"><Phone className="size-3 text-ink-3" /> {c.simu}</span> : null}
        {c.location ? <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3 shrink-0 text-ink-3" /><span className="truncate">{c.location}</span></span> : null}
      </div>

      <div className="mt-auto pt-5">
        <div className="rounded-lg border border-line/70 bg-surface-2 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-ink-3">{hasDebt ? "Deni limebaki" : "Salio"}</span>
            <span className={cn("text-lg font-bold", hasDebt ? "text-ink" : "text-success")}>{fmtPesa(c.bakaa)}</span>
          </div>
          {hasDebt ? (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-right text-[11px] text-ink-3">{pct}% imelipwa</p>
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-success">Malipo yamekamilika</p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-primary opacity-70 transition group-hover:opacity-100">
          Fungua taarifa <ArrowUpRight className="size-3.5" />
        </div>
      </div>
      </Link>
      <div className="flex justify-end border-t border-line/70 px-4 py-2.5">
        <button
          type="button"
          disabled={changing}
          onClick={() => onToggleBlocked(c)}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50", c.imezuiwa ? "text-success hover:bg-success/10" : "text-danger hover:bg-danger/10")}
        >
          {c.imezuiwa ? <RotateCcw className="size-3.5" /> : <Ban className="size-3.5" />}
          {changing ? "Subiri..." : c.imezuiwa ? "Rudisha" : "Zuia"}
        </button>
      </div>
    </article>
  );
}

function CustomerListRow({
  customer: c,
  onToggleBlocked,
  changing,
}: {
  customer: CustomerCardData;
  onToggleBlocked: (customer: CustomerCardData) => void;
  changing: boolean;
}) {
  const hasDebt = c.deniInayoendelea > 0;
  const pct = c.jumlaDeni > 0 ? Math.min(100, Math.round((c.jumlaLipwa / c.jumlaDeni) * 100)) : 0;

  return (
    <div className={cn("flex items-center transition hover:bg-surface-2", c.imezuiwa && "opacity-75")}>
      <Link href={`/customers/${c.id}`} className="group grid min-w-0 flex-1 gap-4 px-4 py-4 sm:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_160px_28px] sm:items-center sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold", hasDebt ? "bg-primary/10 text-primary" : "bg-success/10 text-success")}>
          {initial(c.jina)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">{c.jina}</p>
          <p className="mt-0.5 truncate text-xs text-ink-3">Tangu {fmtTarehe(c.tareheKuandikishwa)}</p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
        {c.simu ? <span className="flex items-center gap-1"><Phone className="size-3 text-ink-3" /> {c.simu}</span> : null}
        {c.location ? <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3 shrink-0 text-ink-3" /><span className="truncate">{c.location}</span></span> : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-bold", hasDebt ? "text-ink" : "text-success")}>{fmtPesa(c.bakaa)}</span>
          <span className={cn("badge", hasDebt ? "badge-wait" : "badge-done")}>{hasDebt ? `${c.deniInayoendelea} deni` : "Hadaiwi"}</span>
        </div>
        {hasDebt ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>

      <ArrowUpRight className="hidden size-4 text-ink-3 transition group-hover:text-primary sm:block" />
      </Link>
      <button
        type="button"
        disabled={changing}
        onClick={() => onToggleBlocked(c)}
        className={cn("mr-3 grid size-8 shrink-0 place-items-center rounded-md transition disabled:opacity-50", c.imezuiwa ? "text-success hover:bg-success/10" : "text-danger hover:bg-danger/10")}
        aria-label={c.imezuiwa ? `Rudisha ${c.jina}` : `Zuia ${c.jina}`}
        title={c.imezuiwa ? "Rudisha" : "Zuia"}
      >
        {c.imezuiwa ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
      </button>
    </div>
  );
}
