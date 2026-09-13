"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, ImagePlus } from "lucide-react";
import { updateCargoHaliAction, uploadRisitiAction } from "@/actions/cargo";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import { toDateInput } from "@/lib/format";
import type { CargoClient } from "@/components/cargo/cargo-view";

export function CargoArriveModal({ cargo, onClose }: { cargo: CargoClient; onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();

  const [tarehe, setTarehe] = useState(toDateInput(new Date()));
  const [maelezo, setMaelezo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function submit() {
    if (!tarehe) {
      toast("Weka tarehe ya kufika.", "error");
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("id", String(cargo.id));
      fd.set("hali", "Imefika");
      fd.set("tarehe_kufika", tarehe);
      fd.set("maelezo_fika", maelezo);

      const res = await updateCargoHaliAction(null, fd);
      if (!res.success) {
        toast(res.message, "error");
        setLoading(false);
        return;
      }

      if (file) {
        const fdu = new FormData();
        fdu.set("mzigo_id", String(cargo.id));
        fdu.set("risiti", file);
        const up = await uploadRisitiAction(null, fdu);
        if (!up.success) toast(up.message, "error");
      }

      toast("Mzigo umefika! ✅");
      onClose();
      router.refresh();
    } catch {
      toast("Hitilafu ya mtandao.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={loading ? () => {} : onClose}
      title="Weka Mzigo Umefika"
      subtitle={`${cargo.jinaKampuni} · Tracking ${cargo.nambariTracking ?? "—"}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <Input label="Tarehe ya Kufika" type="date" value={tarehe} onChange={(e) => setTarehe(e.target.value)} required />
        <Input label="Maelezo ya Ziada" value={maelezo} onChange={(e) => setMaelezo(e.target.value)} placeholder="mfano: Imefika salama, Uharibifu mdogo... (hiari)" />

        <div>
          <span className="label">Picha ya Risiti <span className="font-normal text-ink-3">(hiari – kumbukumbu ya malipo)</span></span>
          <button
            type="button"
            onClick={() => document.getElementById("inp-risiti")?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-2 bg-surface-2 px-4 py-6 text-center transition hover:border-primary"
          >
            {preview ? (
              <img src={preview} alt="Risiti preview" className="max-h-40 rounded-lg" />
            ) : (
              <>
                <ImagePlus className="size-7 text-ink-3" />
                <span className="text-sm font-medium text-ink">Bonyeza kupakia picha ya risiti</span>
                <span className="text-xs text-ink-3">JPEG, PNG, WEBP – max 5MB</span>
              </>
            )}
          </button>
          {preview && (
            <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="mt-2 text-xs font-medium text-danger hover:underline">
              Ondoa picha
            </button>
          )}
          <input id="inp-risiti" type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="button" variant="success" onClick={submit} loading={loading} icon={<CircleCheck />}>
            Thibitisha Kufika
          </Button>
        </div>
      </div>
    </Modal>
  );
}