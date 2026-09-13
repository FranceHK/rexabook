"use client";

import { X } from "lucide-react";

export function RisitiLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Risiti ya malipo"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Funga"
      >
        <X className="size-5" />
      </button>
      <img src={src} alt="Risiti" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl" />
    </div>
  );
}