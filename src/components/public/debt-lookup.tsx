"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Hash, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function DebtLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/deni/${encodeURIComponent(normalized)}`);
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto h-24 w-32" priority />
          <p className="mt-1 text-xs font-medium text-ink-3">Taarifa za deni lako</p>
        </div>

        <section className="panel overflow-hidden p-0">
          <div className="border-b border-line bg-surface-2 px-6 py-5 sm:px-8">
            <h1 className="text-xl font-semibold text-ink">Angalia madeni yako</h1>
            <p className="mt-1 text-sm text-ink-3">Weka namba ya mdaiwa uliyopewa na duka.</p>
          </div>
          <form onSubmit={submit} className="space-y-5 px-6 py-7 sm:px-8">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink-2">Namba ya mdaiwa</span>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="RX-000018-AB12CD34"
                  className="field font-mono uppercase !pl-9"
                  autoComplete="off"
                  autoCapitalize="characters"
                  required
                />
              </div>
            </label>
            <button type="submit" className="btn btn-primary w-full">
              Angalia madeni <ArrowRight className="size-4" />
            </button>
          </form>
        </section>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-3">
          <ShieldCheck className="size-3.5" /> Taarifa zinaonekana kwa kusoma tu.
        </p>
      </div>
    </main>
  );
}
