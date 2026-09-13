"use client";

import { useState } from "react";
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
} from "lucide-react";
import { fmtPesa, fmtTarehe, fmtTareheSaa, initial } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/theme/toast-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { DebtFormModal } from "@/components/customers/debt-form-modal";
import { PaymentFormModal, type PayableDebt } from "@/components/customers/payment-form-modal";
import { PdfReportModal } from "@/components/customers/pdf-report-modal";
import { deleteDebtAction } from "@/actions/debts";

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

export interface CustomerDetailData {
  customer: {
    id: number;
    jina: string;
    simu?: string | null;
    location?: string | null;
    tareheKuandikishwa: string;
  };
  debts: DetailDebt[];
  totals: { kikopa: number; lipwa: number; bakaa: number };
  counts: { total: number; active: number };
}

export function CustomerDetailView({ data }: { data: CustomerDetailData }) {
  const { customer, debts, totals, counts } = data;
  const { toast } = useToast();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayableDebt | null>(null);

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

  const stats = [
    { label: "Madeni yote", value: counts.total.toLocaleString("en-TZ"), icon: ReceiptText },
    { label: "Yanayoendelea", value: counts.active.toLocaleString("en-TZ"), icon: Hourglass },
    { label: "Jumla aliyokopa", value: fmtPesa(totals.kikopa), icon: Wallet },
    { label: "Amelipa", value: fmtPesa(totals.lipwa), icon: CheckCircle2 },
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
            <h1 className="text-2xl font-semibold text-ink">{customer.jina}</h1>
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
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} icon={<Pencil />}>Hariri</Button>
          <Button variant="secondary" size="sm" onClick={() => setPdfOpen(true)} icon={<FileDown />}>Ripoti PDF</Button>
          <Button size="sm" onClick={() => setDebtOpen(true)} icon={<Plus />}>Ongeza Deni</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panel flex items-center gap-4 p-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl neu-inset" style={{ color: "var(--primary)" }}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-ink-3">{label}</p>
              <p className="truncate text-lg font-semibold text-ink">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Debts */}
      {debts.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="grid size-16 place-items-center rounded-full neu-inset text-ink-3">
              <ReceiptText className="size-7" />
            </span>
            <p className="text-sm text-ink-2">
              {counts.total === 0 ? "Mdaiwa huyu hana deni bado." : "Hakuna madeni ya kuonyeshwa."}
            </p>
            <button type="button" onClick={() => setDebtOpen(true)} className="btn btn-primary">
              <Plus className="size-4" /> Ongeza Deni la Kwanza
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          {debts.map((d) => (
            <Card key={d.id} className={cn("overflow-hidden", d.imekamilika && "opacity-90")}>
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
                    <Button variant="ghost" size="sm" className="!text-danger" onClick={() => futaDeni(d)} icon={<Trash2 />}>
                      Futa
                    </Button>
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
                        <p className="text-xs text-ink-3">Inabakia</p>
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
    </div>
  );
}