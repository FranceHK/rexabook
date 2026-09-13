"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createCargoAction } from "@/actions/cargo";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import { fmtPesa, toDateInput } from "@/lib/format";

interface ItemRow {
  key: number;
  jina_bidhaa: string;
  idadi: number;
  kitengo: string;
  bei_kwa_kipande: number;
}

const KITENGO = ["pc", "magunia", "boksi", "tani", "lita", "nyingine"];

let rowKey = 1;

export function CargoFormModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<ItemRow[]>([{ key: rowKey++, jina_bidhaa: "", idadi: 1, kitengo: "pc", bei_kwa_kipande: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = rows.reduce((s, r) => s + (r.idadi || 0) * (r.bei_kwa_kipande || 0), 0);

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const bidhaa = rows.filter((r) => r.jina_bidhaa.trim() && r.idadi > 0);
    if (bidhaa.length === 0 || bidhaa.length !== rows.length) {
      setError("Ongeza angalau bidhaa moja yenye jina, idadi na bei sahihi.");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await createCargoAction({
      jina_kampuni: String(fd.get("jina_kampuni") ?? ""),
      aina_usafiri: String(fd.get("aina_usafiri") ?? "gari"),
      nambari_tracking: String(fd.get("nambari_tracking") ?? ""),
      tarehe_kuagiza: String(fd.get("tarehe_kuagiza") ?? ""),
      tarehe_kutarajiwa: String(fd.get("tarehe_kutarajiwa") ?? ""),
      maelezo: String(fd.get("maelezo") ?? ""),
      bidhaa: bidhaa.map(({ jina_bidhaa, idadi, kitengo, bei_kwa_kipande }) => ({
        jina_bidhaa,
        idadi: Number(idadi),
        kitengo,
        bei_kwa_kipande: Number(bei_kwa_kipande),
      })),
    });

    setLoading(false);
    if (res.success) {
      toast(res.message);
      onClose();
      router.refresh();
    } else {
      setError(res.message);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mzigo Mpya"
      subtitle="Weka taarifa za mzigo na bidhaa zilizoagizwa."
      maxWidth="max-w-2xl"
      glass
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Jina la Kampuni / Msambazaji"
          name="jina_kampuni"
          placeholder="mfano: Alibaba Co. Ltd"
          required
          error={error && error.startsWith("Kampuni") ? error : null}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Aina ya Usafiri" name="aina_usafiri" defaultValue="gari">
            <option value="gari">🚗 Gari</option>
            <option value="ndege">✈️ Ndege</option>
            <option value="bahari">🚢 Bahari</option>
            <option value="treni">🚂 Treni</option>
            <option value="nyingine">📦 Nyingine</option>
          </Select>
          <Input label="Nambari ya Tracking" name="nambari_tracking" placeholder="CN123456789TZ (hiari)" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tarehe ya Kuagiza" name="tarehe_kuagiza" type="date" defaultValue={toDateInput(new Date())} required />
          <Input label="Tarehe Inayotarajiwa" name="tarehe_kutarajiwa" type="date" />
        </div>

        <Textarea label="Maelezo" name="maelezo" placeholder="Maelezo ya ziada (hiari)" className="!min-h-[64px]" />

        {/* Items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0 !text-ink">Bidhaa Zilizoagizwa <span className="text-danger">*</span></span>
            <Button type="button" variant="soft" size="sm" onClick={() => setRows((p) => [...p, { key: rowKey++, jina_bidhaa: "", idadi: 1, kitengo: "pc", bei_kwa_kipande: 0 }])} icon={<Plus />}>
              Ongeza Bidhaa
            </Button>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-surface-2 p-2">
                <div className="col-span-12 sm:col-span-4">
                  <input
                    value={r.jina_bidhaa}
                    onChange={(e) => updateRow(r.key, { jina_bidhaa: e.target.value })}
                    placeholder="Jina la bidhaa"
                    className="field"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <input
                    value={r.idadi || ""}
                    onChange={(e) => updateRow(r.key, { idadi: Number(e.target.value) })}
                    type="number"
                    min={1}
                    placeholder="Idadi"
                    className="field"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <select value={r.kitengo} onChange={(e) => updateRow(r.key, { kitengo: e.target.value })} className="field">
                    {KITENGO.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <input
                    value={r.bei_kwa_kipande || ""}
                    onChange={(e) => updateRow(r.key, { bei_kwa_kipande: Number(e.target.value) })}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Bei/pc"
                    className="field"
                  />
                </div>
                <div className="col-span-12 flex items-center gap-2 sm:col-span-1">
                  <span className="flex-1 text-right text-sm font-semibold text-ink sm:text-left">
                    {r.idadi > 0 && r.bei_kwa_kipande > 0 ? fmtPesa(r.idadi * r.bei_kwa_kipande) : "—"}
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-danger/10 hover:text-danger"
                      aria-label="Ondoa bidhaa"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
            <span className="text-sm text-ink-3">Jumla Yote:</span>
            <span className="text-lg font-bold text-primary">{fmtPesa(total)}</span>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="submit" loading={loading}>Hifadhi Mzigo</Button>
        </div>
      </form>
    </Modal>
  );
}