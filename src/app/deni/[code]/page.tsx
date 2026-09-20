import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hash,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { customerIdFromPublicCode, customerPublicId } from "@/lib/customer-access";
import { toMoney, fmtPesa, fmtTarehe, fmtTareheSaa } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Taarifa za Deni",
  robots: { index: false, follow: false },
};

export default async function PublicDebtPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const customerId = customerIdFromPublicCode(decodeURIComponent(code));
  if (!customerId) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, imezuiwa: false },
    select: {
      id: true,
      jina: true,
      tareheKuandikishwa: true,
      user: { select: { jina_duka: true } },
      debts: {
        orderBy: { tareheKukopa: "desc" },
        select: {
          id: true,
          jinaBidhaa: true,
          kiasiAsili: true,
          kiasiKilicholipwa: true,
          tareheKukopa: true,
          imekamilika: true,
          payments: {
            orderBy: { tarehe: "desc" },
            select: { id: true, kiasi: true, tarehe: true, maelezo: true },
          },
        },
      },
    },
  });
  if (!customer) notFound();

  const debts = customer.debts
    .map((debt) => {
      const original = toMoney(debt.kiasiAsili);
      const paid = toMoney(debt.kiasiKilicholipwa);
      return {
        ...debt,
        original,
        paid,
        balance: Math.max(0, original - paid),
        progress: original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0,
      };
    })
    .sort((a, b) => Number(a.imekamilika) - Number(b.imekamilika));

  const totalOriginal = debts.reduce((sum, debt) => sum + debt.original, 0);
  const totalPaid = debts.reduce((sum, debt) => sum + debt.paid, 0);
  const totalBalance = debts.reduce((sum, debt) => sum + (debt.imekamilika ? 0 : debt.balance), 0);
  const publicId = customerPublicId(customer.id);

  return (
    <main className="min-h-screen bg-bg px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="size-11" markOnly priority />
            <div>
              <p className="font-semibold text-ink">{customer.user?.jina_duka ?? "RexaBook"}</p>
              <p className="text-xs text-ink-3">Taarifa za deni</p>
            </div>
          </div>
          <Link href="/deni" className="btn btn-secondary btn-sm">
            <ArrowLeft className="size-4" /> ID nyingine
          </Link>
        </header>

        <section className="mb-5 overflow-hidden rounded-2xl bg-primary px-5 py-6 text-white shadow-glass sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-white/70">Taarifa za mdaiwa</p>
              <h1 className="mt-1 text-2xl font-semibold">{customer.jina}</h1>
              <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-white/80">
                <Hash className="size-3.5" /> {publicId}
              </p>
            </div>
            <div className="rounded-lg bg-white/12 px-3 py-2 text-right">
              <p className="text-[11px] text-white/70">Mteja tangu</p>
              <p className="text-sm font-semibold">{fmtTarehe(customer.tareheKuandikishwa)}</p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Jumla ya madeni", value: fmtPesa(totalOriginal), icon: ReceiptText, tone: "text-primary bg-primary/10" },
            { label: "Imelipwa", value: fmtPesa(totalPaid), icon: CheckCircle2, tone: "text-success bg-success/10" },
            { label: "Imebaki", value: fmtPesa(totalBalance), icon: Wallet, tone: "text-warning bg-warning/10" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="panel flex items-center gap-3 p-4">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tone)}><Icon className="size-[18px]" /></span>
              <div className="min-w-0">
                <p className="text-xs text-ink-3">{label}</p>
                <p className="truncate text-base font-bold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Madeni yako</h2>
            <p className="text-xs text-ink-3">Madeni yanayoendelea yanaonekana kwanza</p>
          </div>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2">{debts.length}</span>
        </div>

        {debts.length === 0 ? (
          <section className="panel px-5 py-12 text-center">
            <CheckCircle2 className="mx-auto size-8 text-success" />
            <p className="mt-3 font-medium text-ink">Huna deni lililoandikwa.</p>
          </section>
        ) : (
          <section className="space-y-4">
            {debts.map((debt) => (
              <article key={debt.id} className="panel overflow-hidden p-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <p className="font-semibold text-ink">{debt.jinaBidhaa ?? "Deni"}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                      <CalendarDays className="size-3" /> {fmtTarehe(debt.tareheKukopa)}
                    </p>
                  </div>
                  <Badge tone={debt.imekamilika ? "done" : "wait"}>{debt.imekamilika ? "Imelipwa" : "Inaendelea"}</Badge>
                </div>
                <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_0.8fr]">
                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      <Amount label="Deni" value={fmtPesa(debt.original)} />
                      <Amount label="Imelipwa" value={fmtPesa(debt.paid)} success />
                      <Amount label="Imebaki" value={fmtPesa(debt.balance)} warning={debt.balance > 0} />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${debt.progress}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-ink-3">{debt.progress}% imelipwa</p>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-3"><Clock3 className="size-3.5" /> Malipo ya karibuni</p>
                    {debt.payments.length === 0 ? (
                      <p className="rounded-lg bg-surface-2 px-3 py-3 text-xs text-ink-3">Hakuna malipo bado.</p>
                    ) : (
                      <div className="space-y-2">
                        {debt.payments.slice(0, 4).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
                            <span className="text-xs text-ink-3">{fmtTareheSaa(payment.tarehe)}</span>
                            <span className="text-sm font-semibold text-success">+{fmtPesa(payment.kiasi)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-3">
          <ShieldCheck className="size-3.5" /> Ukurasa huu ni wa kusoma taarifa pekee.
        </p>
      </div>
    </main>
  );
}

function Amount({ label, value, success = false, warning = false }: { label: string; value: string; success?: boolean; warning?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", success ? "text-success" : warning ? "text-warning" : "text-ink")}>{value}</p>
    </div>
  );
}
