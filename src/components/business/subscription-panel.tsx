"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock3, Lock, RefreshCw, ShieldAlert, Smartphone, Sparkles, X } from "lucide-react";
import { checkSubscriptionPaymentAction, startSubscriptionPaymentAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";

type PlanId = "BASIC" | "FULL";

export interface SubscriptionPanelData {
  status: string;
  active: boolean;
  trial: boolean;
  plan: PlanId;
  planLabel: string;
  endsAt: string | null;
  daysLeft: number;
}

export interface SubscriptionPaymentRow {
  id: number;
  amount: number;
  months: number;
  plan: PlanId;
  status: string;
  reference: string | null;
  createdAt: string;
}

const PLAN_IDS: PlanId[] = ["BASIC", "FULL"];

const PLAN_POINTS: Record<PlanId, Array<{ label: string; included: boolean }>> = {
  BASIC: [
    { label: "Wadaiwa, madeni na malipo", included: true },
    { label: "Bidhaa, stock na mauzo", included: true },
    { label: "Matumizi na risiti", included: true },
    { label: "Wafanyakazi (meneja, cashier)", included: false },
    { label: "Mizigo", included: false },
    { label: "Backup na audit", included: false },
  ],
  FULL: [
    { label: "Wadaiwa, madeni na malipo", included: true },
    { label: "Bidhaa, stock na mauzo", included: true },
    { label: "Matumizi na risiti", included: true },
    { label: "Wafanyakazi (meneja, cashier)", included: true },
    { label: "Mizigo", included: true },
    { label: "Backup na audit", included: true },
  ],
};

/** What the guards in lib/auth and the server actions actually refuse once the subscription lapses. */
const EXPIRED_LOCKED = [
  "Dashibodi haifunguki",
  "Wadaiwa: kuona wateja, kuongeza madeni, kupokea malipo na kutuma vikumbusho",
  "Kurekodi mauzo mapya na kutoa risiti",
  "Kuongeza bidhaa na kurekebisha stock",
  "Kurekodi matumizi",
  "Mizigo: kuona na kuongeza",
  "Kupakua backup ya data",
];

const EXPIRED_ALLOWED = [
  "Kuingia na kufungua ukurasa wa Biashara",
  "Kuona (bila kubadilisha) bidhaa, mauzo na matumizi ya zamani",
  "Kulipia subscription",
  "Mipangilio ya akaunti",
];

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

function ExpiredNotice() {
  return (
    <div className="rounded-lg border border-danger/25 bg-danger/5 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger"><ShieldAlert className="size-5" /></span>
        <div>
          <p className="font-semibold text-ink">Subscription imeisha</p>
          <p className="mt-1 text-sm text-ink-2">
            Lipia kifurushi ili kufungua mfumo wote. Data yako iko salama, haijafutwa.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-danger"><Lock className="size-3.5" /> Vimefungwa hadi ulipie</p>
          <ul className="space-y-1.5 text-sm text-ink-2">
            {EXPIRED_LOCKED.map((item) => <li key={item} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-danger" /> {item}</li>)}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-success"><CheckCircle2 className="size-3.5" /> Bado unaweza</p>
          <ul className="space-y-1.5 text-sm text-ink-2">
            {EXPIRED_ALLOWED.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionPanel({
  subscription,
  payments,
  snippeConfigured,
}: {
  subscription: SubscriptionPanelData;
  payments: SubscriptionPaymentRow[];
  snippeConfigured: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [plan, setPlan] = useState<PlanId>(subscription.plan);
  const [busy, setBusy] = useState<string | null>(null);

  async function pay(form: HTMLFormElement) {
    setBusy("pay");
    const result = await startSubscriptionPaymentAction(null, new FormData(form));
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      form.reset();
      router.refresh();
    }
  }

  async function check(paymentId: number) {
    setBusy(`check-${paymentId}`);
    const result = await checkSubscriptionPaymentAction(paymentId);
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    router.refresh();
  }

  const endsLabel = subscription.endsAt ? date(subscription.endsAt) : null;
  const headline = !subscription.active
    ? subscription.trial ? "Majaribio yameisha" : "Subscription imeisha"
    : subscription.trial ? "Uko kwenye majaribio" : `Kifurushi cha ${subscription.planLabel}`;
  const detail = !subscription.active
    ? endsLabel ? `Muda uliisha ${endsLabel}. Chagua kifurushi hapa chini ili kuendelea.` : "Chagua kifurushi hapa chini ili kuanza."
    : subscription.trial
      ? `Vipengele vyote viko wazi hadi ${endsLabel ?? "mwisho wa majaribio"}.`
      : `Kinaendelea hadi ${endsLabel ?? "-"}. Ukilipia mapema, siku zinaongezwa juu ya zilizobaki.`;
  const urgent = subscription.active && subscription.daysLeft <= 5;

  return (
    <div className="space-y-5">
      <section
        className={`relative overflow-hidden rounded-lg p-6 text-white shadow-card ${
          subscription.active ? "bg-gradient-to-br from-primary to-info" : "bg-gradient-to-br from-danger to-warning"
        }`}
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 right-24 size-44 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/15">
              {subscription.active ? <Sparkles className="size-6" /> : <ShieldAlert className="size-6" />}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Subscription ya RexaBook</p>
              <h2 className="mt-1 text-2xl font-semibold">{headline}</h2>
              <p className="mt-1.5 max-w-xl text-sm text-white/85">{detail}</p>
            </div>
          </div>
          {subscription.active && (
            <div className={`rounded-lg px-5 py-3 text-center ${urgent ? "bg-white text-danger" : "bg-white/15"}`}>
              <p className="text-3xl font-semibold leading-none">{subscription.daysLeft}</p>
              <p className={`mt-1 flex items-center justify-center gap-1 text-xs ${urgent ? "text-danger" : "text-white/80"}`}><Clock3 className="size-3.5" /> siku zimebaki</p>
            </div>
          )}
        </div>
      </section>

      {!subscription.active && <ExpiredNotice />}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void pay(event.currentTarget);
        }}
        className="space-y-5"
      >
        <input type="hidden" name="plan" value={plan} />
        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const selected = plan === id;
            const info = SUBSCRIPTION_PLANS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                aria-pressed={selected}
                className={`relative rounded-lg border-2 bg-surface p-5 text-left shadow-card transition ${
                  selected ? "border-primary ring-4 ring-primary/10" : "border-line hover:border-primary/40"
                }`}
              >
                {id === "FULL" && <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Kamili zaidi</span>}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-ink-3">{info.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{money(info.price)}</p>
                    <p className="text-xs text-ink-3">kwa mwezi</p>
                  </div>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-primary bg-primary text-white" : "border-line text-transparent"}`}>
                    <Check className="size-3.5" />
                  </span>
                </div>
                <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  {PLAN_POINTS[id].map((point) => (
                    <li key={point.label} className={`flex items-center gap-2 ${point.included ? "text-ink-2" : "text-ink-3 line-through decoration-ink-3/50"}`}>
                      {point.included ? <Check className="size-4 shrink-0 text-success" /> : <X className="size-4 shrink-0 text-ink-3" />}
                      {point.label}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <Card>
          <CardBody>
            <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
              <Input label="Namba ya simu ya malipo (M-Pesa, Tigo Pesa, Airtel Money)" name="namba_malipo" type="tel" placeholder="0712345678" required />
              <Button type="submit" size="lg" loading={busy === "pay"} disabled={!snippeConfigured} icon={<Smartphone />}>
                Lipa {money(SUBSCRIPTION_PLANS[plan].price)}
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              {snippeConfigured
                ? `Utapokea ombi la malipo kwenye simu; thibitisha kwa PIN. Kifurushi cha ${SUBSCRIPTION_PLANS[plan].label} kitawashwa kwa mwezi mmoja malipo yakithibitishwa.`
                : "Malipo ya simu bado hayajaunganishwa. Wasiliana na admin wa RexaBook."}
            </p>
          </CardBody>
        </Card>
      </form>

      <Card>
        <CardHeader title="Historia ya Malipo" action={<span className="badge badge-info">{payments.length}</span>} />
        <CardBody className="!p-0">
          {payments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna malipo ya subscription bado.</p>
          ) : (
            <div className="divide-y divide-line">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-ink">{SUBSCRIPTION_PLANS[payment.plan].label} · {money(payment.amount)}</p>
                    <p className="text-xs text-ink-3">{date(payment.createdAt)} · {payment.reference || "Haijapata reference"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${payment.status === "ACTIVE" ? "badge-done" : payment.status === "PENDING" ? "badge-wait" : "badge-danger"}`}>
                      {payment.status === "ACTIVE" ? "Imelipwa" : payment.status === "PENDING" ? "Inasubiri" : "Haikufanikiwa"}
                    </span>
                    {payment.status === "PENDING" && payment.reference && (
                      <Button size="sm" variant="outline" loading={busy === `check-${payment.id}`} icon={<RefreshCw />} onClick={() => void check(payment.id)}>Kagua</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
