"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, ReceiptText } from "lucide-react";
import { uploadRisitiAction } from "@/actions/cargo";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import type { CargoClient } from "@/components/cargo/cargo-view";

export function CargoRisitiModal({ cargo, onClose }: { cargo: CargoClient; onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();

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
    if (!file) {
      toast("Chagua picha ya risiti kwanza.", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("mzigo_id", String(cargo.id));
      fd.set("risiti", file);
      const res = await uploadRisitiAction(null, fd);
      if (res.success) {
        toast("Risiti imechapishwa. Mzigo sasa umelipwa ✅");
        onClose();
        router.refresh();
      } else {
        toast(res.message, "error");
      }
    } catch {
      toast("Hitilafu ya mtandao.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={loading ? () => {} : onClose} title="Weka Risiti ya Malipo" subtitle={cargo.jinaKampuni} maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <span className="label">Picha ya Risiti</span>
          <button
            type="button"
            onClick={() => document.getElementById("inp-risiti2")?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-2 bg-surface-2 px-4 py-6 text-center transition hover:border-primary"
          >
            {preview ? (
              <Image src={preview} alt="Risiti preview" width={320} height={160} unoptimized className="max-h-40 w-auto rounded-lg object-contain" />
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
          <input id="inp-risiti2" type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="button" variant="success" onClick={submit} loading={loading} icon={<ReceiptText />}>
            Chapisha Risiti
          </Button>
        </div>
      </div>
    </Modal>
  );
}
