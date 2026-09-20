"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  FileDown,
  Pencil,
  Trash2,
  Wallet,
  ReceiptText,
  CheckCircle2,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  BellRing,
  Send,
  Package,
  Ellipsis,
  ChevronDown,
  ListFilter,
  Hash,
  Link2,
  Ban,
  RotateCcw,
} from "lucide-react";
import { fmtPesa, fmtTarehe, fmtTareheSaa, initial } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/theme/toast-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { DebtFormModal } from "@/components/customers/debt-form-modal";
import { PaymentFormModal, type PayableDebt } from "@/components/customers/payment-form-modal";
import { PdfReportModal } from "@/components/customers/pdf-report-modal";
import { PaymentCalendar } from "@/components/customers/payment-calendar";
import { deleteDebtAction } from "@/actions/debts";
import { sendDebtReminderAction, setCustomerBlockedAction } from "@/actions/customers";

export interface DetailDebt {
  id: number;
  jinaBidhaa?: string | null;
  kiasiAsili: number;
  kiasiKilicholipwa: number;
  bakaa: number;
  pct: number;
  tareheKukopa: string;
  maelezo?: string | null;
  imekamilika: boolean;
  malipo: { id: number; kiasi: number; tarehe: string; maelezo?: string | null }[];
}

export interface DetailSms {
  id: number;
  ujumbe: string;
  status: "success" | "failed" | "pending";
  tarehe: string;
}

export interface CustomerDetailData {
  customer: {
    id: number;
    jina: string;
    simu?: string | null;
    location?: string | null;
    imezuiwa: boolean;
    publicId: string;
    tareheKuandikishwa: string;
  };
  debts: DetailDebt[];
  totals: { kikopa: number; lipwa: number; bakaa: number };
  counts: { total: number; active: number };
  reminderMessage: string | null;
  sms: DetailSms[];
}

export function CustomerDetailView({ data }: { data: CustomerDetailData }) {
  const { customer, debts, totals, counts, sms } = data;
  const { toast } = useToast();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayableDebt | null>(null);
  const [page, setPage] = useState(0);
  const [debtFilter, setDebtFilter] = useState<"all" | "active" | "paid">("all");
  const [smsOpen, setSmsOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reminding, setReminding] = useState(false);
  const actionsRef = useRef<HTMLDetailsElement>(null);

  const PER_PAGE = 4;
  const filteredDebts = debts.filter((debt) => {
    if (debtFilter === "active") return !debt.imekamilika;
    if (debtFilter === "paid") return debt.imekamilika;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredDebts.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleDebts = filteredDebts.slice(currentPage * PER_PAGE, currentPage * PER_PAGE + PER_PAGE);
  const paymentCalendarEntries = debts.flatMap((debt) =>
    debt.malipo.map((payment) => ({
      id: payment.id,
      amount: payment.kiasi,
      date: payment.tarehe,
      product: debt.jinaBidhaa?.trim() || "Deni",
    }))
  );

  async function futaDeni(d: DetailDebt) {
    if (!window.confirm("Una uhakika wa kufuta deni hili? Hatua hii haiwezi kurudishwa.")) return;
    const res = await deleteDebtAction(d.id);
    if (res.success) {
      toast(res.message);
      router.refresh();
    } else {
      toast(res.message, "error");
    }
  }

  async function copyPublicLink() {
    const link = `${window.location.origin}/deni/${customer.publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("Link ya mdaiwa imenakiliwa.");
      if (actionsRef.current) actionsRef.current.open = false;
    } catch {
      toast("Imeshindikana kunakili link. Jaribu tena.", "error");
    }
  }

  function chooseDebtFilter(filter: "all" | "active" | "paid") {
    setDebtFilter(filter);
    setPage(0);
  }

  async function toggleBlocked() {
    const nextBlocked = !customer.imezuiwa;
    if (nextBlocked && !window.confirm(`Mzuie ${customer.jina}? Atafichwa kwenye orodha ya kawaida.`)) return;

    setBlocking(true);
    const result = await setCustomerBlockedAction(customer.id, nextBlocked);
    setBlocking(false);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      if (nextBlocked) router.push("/customers");
      else router.refresh();
    }
  }

  async function sendReminder() {
    setReminding(true);
    const result = await sendDebtReminderAction(customer.id);
    setReminding(false);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      setReminderOpen(false);
      router.refresh();
    }
  }

  const stats = [
    { label: "Madeni yote", value: counts.total.toLocaleString("en-TZ"), icon: ReceiptText },
    { label: "Yanayoendelea", value: counts.active.toLocaleString("en-TZ"), icon: Hourglass },
    { label: "Jumla aliyokopa", value: fmtPesa(totals.kikopa), icon: Wallet },
    { label: "Deni lililobaki", value: fmtPesa(totals.bakaa), icon: CheckCircle2, accent: "--warning" },
  ];

  return (
    <div>
      {/* Back + header */}
      <button
        type="button"
        onClick={() => router.push("/customers")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 transition hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Wadaiwa
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl neu text-2xl font-bold text-primary">
            {initial(customer.jina)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{customer.jina}</h1>
              {customer.imezuiwa ? <Badge tone="danger">Amezuiwa</Badge> : null}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-xs font-semibold text-ink-2">
              <Hash className="size-3 text-primary" /> {customer.publicId}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
              {customer.simu ? (
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-ink-3" /> {customer.simu}</span>
              ) : null}
              {customer.location ? (
                <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-ink-3" /> {customer.location}</span>
              ) : null}
              <span className="text-ink-3">Tangu {fmtTarehe(customer.tareheKuandikishwa)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="warning"
            size="sm"
            onClick={() => setReminderOpen(true)}
            disabled={!customer.simu || !data.reminderMessage}
            title={!customer.simu ? "Ongeza namba ya simu kwanza" : !data.reminderMessage ? "Hakuna deni linaloendelea" : "Tuma ukumbusho wa deni"}
            icon={<BellRing />}
          >
            Mkumbushe Deni
          </Button>
          <Button size="sm" onClick={() => setDebtOpen(true)} icon={<Plus />}>Ongeza Deni</Button>
          <details ref={actionsRef} className="group relative">
            <summary className="btn btn-secondary btn-sm cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
              <Ellipsis className="size-4" /> Vitendo <ChevronDown className="size-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-lg border border-line bg-surface p-1.5 shadow-xl">
              <button type="button" onClick={copyPublicLink} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-surface-2 hover:text-primary">
                <Link2 className="size-4" /> Nakili link ya mdaiwa
              </button>
              <button type="button" onClick={() => { setEditOpen(true); if (actionsRef.current) actionsRef.current.open = false; }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-surface-2 hover:text-primary">
                <Pencil className="size-4" /> Hariri taarifa
              </button>
              <button type="button" onClick={() => { setPdfOpen(true); if (actionsRef.current) actionsRef.current.open = false; }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-surface-2 hover:text-primary">
                <FileDown className="size-4" /> Pakua ripoti PDF
              </button>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                disabled={blocking}
                onClick={toggleBlocked}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition disabled:opacity-50",
                  customer.imezuiwa ? "text-success hover:bg-success/10" : "text-danger hover:bg-danger/10"
                )}
              >
                {customer.imezuiwa ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                {customer.imezuiwa ? "Rudisha mdaiwa" : "Zuia mdaiwa"}
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="panel p-4 transition hover:border-primary/20 hover:shadow-sm">
            <div className="flex items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg" style={{ color: `var(${accent ?? "--primary"})`, background: `color-mix(in srgb, var(${accent ?? "--primary"}) 12%, transparent)` }}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="mt-0.5 truncate text-lg font-semibold" style={{ color: `var(${accent ?? "--primary"})` }}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Madeni ya {customer.jina}</h2>
          <p className="text-xs text-ink-3">Chuja madeni au chagua siku ya malipo kwenye kalenda.</p>
        </div>
        <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface-2 p-1" aria-label="Chuja madeni">
          <span className="grid size-8 shrink-0 place-items-center text-ink-3"><ListFilter className="size-4" /></span>
          {([
            ["all", "Yote", debts.length],
            ["active", "Yanayoendelea", counts.active],
            ["paid", "Yamelipwa", debts.length - counts.active],
          ] as const).map(([filter, label, count]) => (
            <button
              key={filter}
              type="button"
              onClick={() => chooseDebtFilter(filter)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition",
                debtFilter === filter ? "bg-surface text-primary shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"
              )}
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
      {/* Debts */}
      {filteredDebts.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full neu-inset text-ink-3">
              <ReceiptText className="size-7" />
            </span>
            <p className="text-sm text-ink-2">
              {counts.total === 0 ? "Mdaiwa huyu hana deni bado." : "Hakuna madeni kwenye kichujio hiki."}
            </p>
            <button type="button" onClick={() => setDebtOpen(true)} className="btn btn-primary">
              <Plus className="size-4" /> Ongeza Deni la Kwanza
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {visibleDebts.map((d, i) => (
            <Card
              key={d.id}
              className={cn("anim-up overflow-hidden", d.imekamilika && "opacity-90")}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <CardBody className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 place-items-center rounded-xl", d.imekamilika ? "bg-success/12 text-success" : "bg-warning/12 text-warning")}>
                      {d.imekamilika ? <CheckCircle2 className="size-5" /> : <Hourglass className="size-5" />}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{d.jinaBidhaa ?? "Deni"}</p>
                      <p className="text-xs text-ink-3">
                        Ilikopwa {fmtTareheSaa(d.tareheKukopa)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.imekamilika ? <Badge tone="done">Imelipwa</Badge> : <Badge tone="wait">Inadaiwa</Badge>}
                    {d.kiasiKilicholipwa === 0 ? (
                      <Button variant="ghost" size="sm" className="!text-danger" onClick={() => futaDeni(d)} icon={<Trash2 />}>
                        Futa
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-5 px-5 py-4 md:grid-cols-2">
                  <div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-ink-3">Asili</p>
                        <p className="text-sm font-semibold text-ink">{fmtPesa(d.kiasiAsili)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-3">Imelipwa</p>
                        <p className="text-sm font-semibold text-success">{fmtPesa(d.kiasiKilicholipwa)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-3">Imebaki</p>
                        <p className={cn("text-sm font-semibold", d.bakaa === 0 ? "text-success" : "text-warning")}>
                          {fmtPesa(d.bakaa)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ProgressBar pct={d.pct} labelRight={`${d.pct}%`} />
                    </div>
                    {d.maelezo ? <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">{d.maelezo}</p> : null}
                    {!d.imekamilika ? (
                      <div className="mt-4">
                        <Button variant="success" size="sm" onClick={() => setPayTarget({ id: d.id, jinaBidhaa: d.jinaBidhaa, kiasiAsili: d.kiasiAsili, kiasiKilicholipwa: d.kiasiKilicholipwa, bakaa: d.bakaa })} icon={<Wallet />}>
                          Weka Malipo
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
                      <ReceiptText className="size-3.5" /> Histori ya Malipo
                    </p>
                    {d.malipo.length === 0 ? (
                      <p className="text-sm text-ink-3">Hakuna malipo bado kwa deni hili.</p>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                        {d.malipo.map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium text-ink">+{fmtPesa(m.kiasi)}</p>
                              <p className="truncate text-xs text-ink-3">
                                {fmtTareheSaa(m.tarehe)}{m.maelezo ? ` · ${m.maelezo}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredDebts.length > PER_PAGE && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-3 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Ukurasa uliopita"
            title="Ukurasa uliopita"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex max-w-full items-center gap-1 overflow-x-auto p-1" aria-label="Kurasa za madeni">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold transition",
                  currentPage === index
                    ? "bg-primary text-white shadow-sm"
                    : "border border-line bg-surface text-ink-2 hover:border-primary/30 hover:text-primary"
                )}
                aria-label={`Ukurasa ${index + 1}`}
                aria-current={currentPage === index ? "page" : undefined}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-3 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Ukurasa unaofuata"
            title="Ukurasa unaofuata"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
        </div>

        <PaymentCalendar payments={paymentCalendarEntries} />
      </div>

      {/* SMS history */}
      <Card className="mt-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-primary" /> Ujumbe wa SMS
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => setSmsOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-primary/30 hover:text-primary"
              aria-expanded={smsOpen}
            >
              {sms.length > 0 ? `${sms.length} za mwisho` : "Hakuna ujumbe"}
              <ChevronDown className={cn("size-3.5 transition", smsOpen && "rotate-180")} />
            </button>
          }
        />
        {smsOpen ? <CardBody>
          {!customer.simu ? (
            <p className="text-sm text-ink-3">
              Mteja huyu hana namba ya simu — SMS haziwezi kutumwa. Ongera namba kwanza kupitia kitufe cha Hariri.
            </p>
          ) : sms.length === 0 ? (
            <p className="text-sm text-ink-3">
              Hakuna SMS zilizotumwa kwa mteja huyu bado. Utaziona hapa baada ya kuongeza deni au malipo.
            </p>
          ) : (
            <ul className="space-y-3">
              {sms.map((s) => (
                <li key={s.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink-3">{fmtTareheSaa(s.tarehe)}</span>
                    {s.status === "success" ? (
                      <Badge tone="done">Imetumwa</Badge>
                    ) : s.status === "failed" ? (
                      <Badge tone="danger">Imeshindikana</Badge>
                    ) : (
                      <Badge tone="wait">Inasubiri</Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap rounded-xl bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink-2">
                    {s.ujumbe}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody> : null}
      </Card>

      {/* Modals */}
      <CustomerFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customerId={customer.id}
        initial={{ jina: customer.jina, simu: customer.simu ?? "", location: customer.location ?? "" }}
        onSuccess={(msg) => { toast(msg); router.refresh(); }}
      />
      <DebtFormModal open={debtOpen} onClose={() => setDebtOpen(false)} customerId={customer.id} customerName={customer.jina} />
      <PaymentFormModal debt={payTarget} open={payTarget !== null} onClose={() => setPayTarget(null)} />
      <PdfReportModal customerId={customer.id} open={pdfOpen} onClose={() => setPdfOpen(false)} />
      <Modal
        open={reminderOpen}
        onClose={() => !reminding && setReminderOpen(false)}
        title="Mkumbushe deni"
        subtitle={`Hakiki ujumbe kabla ya kuutuma kwa ${customer.jina}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReminderOpen(false)} disabled={reminding}>Ghairi</Button>
            <Button variant="warning" onClick={sendReminder} loading={reminding} icon={<Send />}>Tuma SMS</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Phone className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">Itatumwa kwenda</p>
                <p className="truncate text-sm font-semibold text-ink">{customer.simu}</p>
              </div>
            </div>
            <Badge tone="wait">{counts.active} yanayoendelea</Badge>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-ink-3">
              <Package className="size-3.5" /> Hakikisho la ujumbe
            </p>
            <div className="rounded-lg border border-line bg-surface px-4 py-4 text-sm leading-6 text-ink-2 shadow-sm">
              {data.reminderMessage}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-3">
            Ujumbe una salio lote, idadi ya madeni yanayoendelea na majina ya bidhaa ambazo bado hazijalipwa.
          </p>
        </div>
      </Modal>
    </div>
  );
}
