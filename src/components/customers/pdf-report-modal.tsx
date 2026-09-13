"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";

type ReportType = "wiki" | "mwezi" | "miezi_3" | "miezi_6" | "mwaka" | "custom";

const REPORT_LABELS: Record<ReportType, string> = {
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

  const [type, setType] = useState<ReportType>("mwezi");
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
      title="Ripoti ya PDF"
      subtitle="Chagua kipindi cha madeni ya mdaiwa huyu."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
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

        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            className="size-4 rounded accent-[var(--primary)]"
            checked={includePayments}
            onChange={(e) => setIncludePayments(e.target.checked)}
          />
          Jumuisha historia ya malipo ya kila deni
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