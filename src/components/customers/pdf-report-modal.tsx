"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileDown, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";

type ReportType = "yote" | "wiki" | "mwezi" | "miezi_3" | "miezi_6" | "mwaka" | "custom";

const REPORT_LABELS: Record<ReportType, string> = {
  yote: "Historia Yote",
  wiki: "Wiki ya Mwisho (siku 7)",
  mwezi: "Mwezi Huu",
  miezi_3: "Miezi 3 Iliyopita",
  miezi_6: "Miezi 6 Iliyopita",
  mwaka: "Mwaka Huu",
  custom: "Kipindi Maalum (chagua tarehe)",
};

export function PdfReportModal({
  customerId,
  open,
  onClose,
}: {
  customerId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [type, setType] = useState<ReportType>("yote");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [includePayments, setIncludePayments] = useState(true);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (type === "custom" && (!start || !end)) {
      toast("Chagua tarehe za anza na mwisho.", "error");
      return;
    }
    if (type === "custom" && start > end) {
      toast("Tarehe ya anza lazima iwe kabla ya tarehe ya mwisho.", "error");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mteja_id", String(customerId));
      params.set("report_type", type);
      if (type === "custom") {
        params.set("start_date", start);
        params.set("end_date", end);
      }
      params.set("include_payments", String(includePayments));

      const res = await fetch(`/api/pdf?${params.toString()}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        let msg = "Imeshindikana kutengeneza ripoti.";
        try {
          const body = await res.json();
          msg = body.ujumbe ?? msg;
        } catch { /* ignore */ }
        setLoading(false);
        toast(msg, "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="(.+)"/);
      a.download = m ? m[1] : `ripoti_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLoading(false);
      toast("Ripoti ya PDF imepakuliwa.");
      onClose();
      router.refresh();
    } catch {
      setLoading(false);
      toast("Kuna tatizo la mtandao. Jaribu tena.", "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title="Ripoti ya Mdaiwa"
      subtitle="Tengeneza taarifa rasmi ya madeni na malipo."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">PDF yenye muhtasari kamili</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">Inajumuisha namba ya mdaiwa, jumla ya deni, kilicholipwa, salio na maelezo ya kila deni.</p>
          </div>
        </div>

        <Select label="Kipindi cha ripoti" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
          {(Object.keys(REPORT_LABELS) as ReportType[]).map((t) => (
            <option key={t} value={t}>{REPORT_LABELS[t]}</option>
          ))}
        </Select>

        {type === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tarehe ya anza" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input label="Tarehe ya mwisho" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
          <input
            type="checkbox"
            className="size-4 rounded accent-[var(--primary)]"
            checked={includePayments}
            onChange={(e) => setIncludePayments(e.target.checked)}
          />
          <span className="flex-1">
            <span className="block font-medium text-ink">Historia ya malipo</span>
            <span className="mt-0.5 block text-xs text-ink-3">Onyesha kila malipo ndani ya ripoti</span>
          </span>
          {includePayments ? <CheckCircle2 className="size-4 text-success" /> : null}
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="button" onClick={generate} loading={loading} icon={<FileDown />}>
            Pakua PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
