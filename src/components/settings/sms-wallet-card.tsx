"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  MessageSquareText,
  Power,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  cancelSmsPurchaseAction,
  checkSmsPurchaseStatusAction,
  requestSmsPurchaseAction,
  updateSmsPreferenceAction,
} from "@/actions/sms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";
import { SMS_CHARACTERS_PER_UNIT, SMS_SELLING_PRICE } from "@/lib/sms-pricing";
import type { ActionResult } from "@/lib/action-result";

export interface SmsPurchaseClient {
  id: number;
  units: number;
  total: number;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "FAILED";
  reference?: string | null;
  provider?: string | null;
  paymentStatus?: string | null;
  createdAt: string;
}

export interface SmsWalletClient {
  enabled: boolean;
  balance: number;
  configured: boolean;
  snippeConfigured: boolean;
  phone?: string | null;
  purchases: SmsPurchaseClient[];
}

const purchaseOptions = [25, 50, 100, 250];

function statusLabel(status: SmsPurchaseClient["status"]): string {
  if (status === "PAID") return "Imethibitishwa";
  if (status === "CANCELLED") return "Imeghairiwa";
  if (status === "REJECTED") return "Imekataliwa";
  if (status === "FAILED") return "Imeshindwa";
  return "Inasubiri";
}

export function SmsWalletCard({ account }: { account: SmsWalletClient }) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(account.enabled);
  const [units, setUnits] = useState(25);
  const [paymentPhone, setPaymentPhone] = useState(account.phone ?? "");
  const [toggleBusy, setToggleBusy] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [cancelBusyId, setCancelBusyId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => Math.max(0, units) * SMS_SELLING_PRICE, [units]);

  async function toggleSms() {
    setToggleBusy(true);
    const next = !enabled;
    const result = await updateSmsPreferenceAction(next);
    setToggleBusy(false);
    if (result.success) {
      setEnabled(next);
      toast(result.message);
      router.refresh();
    } else {
      toast(result.message, "error");
    }
  }

  async function requestPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPurchaseBusy(true);
    setError(null);
    const result: ActionResult = await requestSmsPurchaseAction(null, new FormData(form));
    setPurchaseBusy(false);
    if (result.success) {
      toast(result.message);
      setUnits(25);
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  async function checkPurchase(purchase: SmsPurchaseClient) {
    setCheckingId(purchase.id);
    const result = await checkSmsPurchaseStatusAction(purchase.id);
    setCheckingId(null);
    toast(result.message, result.success ? "success" : "error");
    router.refresh();
  }

  async function cancelPurchase(purchase: SmsPurchaseClient) {
    if (!window.confirm(`Ghairi ombi la SMS ${purchase.units.toLocaleString("en-TZ")}?`)) return;
    setCancelBusyId(purchase.id);
    const result = await cancelSmsPurchaseAction(purchase.id);
    setCancelBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader
        title={
          <span className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-info/12 text-info">
              <MessageSquareText className="size-4" />
            </span>
            SMS na Salio
          </span>
        }
        action={
          <button
            type="button"
            onClick={toggleSms}
            disabled={toggleBusy}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              enabled
                ? "border-success/25 bg-success/10 text-success"
                : "border-line bg-surface-2 text-ink-3"
            }`}
            aria-pressed={enabled}
          >
            <Power className="size-4" />
            {toggleBusy ? "Subiri..." : enabled ? "SMS zimewashwa" : "SMS zimezimwa"}
          </button>
        }
      />
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <WalletCards className="size-4" />
                  </span>
                  <span className={account.balance > 0 ? "badge badge-done" : "badge badge-wait"}>
                    Salio
                  </span>
                </div>
                <p className="text-3xl font-semibold text-ink">{account.balance.toLocaleString("en-TZ")}</p>
                <p className="mt-1 text-sm text-ink-3">vipande vya SMS vilivyopo</p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning">
                    <ShoppingCart className="size-4" />
                  </span>
                  <span className="badge badge-info">TZS {SMS_SELLING_PRICE}</span>
                </div>
                <p className="text-lg font-semibold text-ink">SMS 1</p>
                <p className="mt-1 text-sm text-ink-3">hadi herufi {SMS_CHARACTERS_PER_UNIT}</p>
              </div>
            </div>

            <div className={`mt-4 flex items-start gap-3 rounded-lg p-4 ${account.configured ? "bg-success/8" : "bg-warning/8"}`}>
              {account.configured ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              )}
              <div>
                <p className="text-sm font-semibold text-ink">
                  {account.configured ? "Meseji imeunganishwa" : "Meseji haijaunganishwa"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-3">
                  {account.configured
                    ? "Salio hukatwa baada ya SMS kutumwa kwa mafanikio. Ujumbe ukishindwa, vipande vinarudishwa."
                    : "Ununuzi na utumaji wa SMS havitapatikana hadi admin aweke API credentials."}
                </p>
              </div>
            </div>
            <div className={`mt-3 flex items-start gap-3 rounded-lg p-4 ${account.snippeConfigured ? "bg-primary/8" : "bg-warning/8"}`}>
              <Smartphone className={`mt-0.5 size-5 shrink-0 ${account.snippeConfigured ? "text-primary" : "text-warning"}`} />
              <div>
                <p className="text-sm font-semibold text-ink">Malipo ya Snippe</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-3">
                  {account.snippeConfigured
                    ? "Lipa moja kwa moja kwa M-Pesa, Airtel Money, Mixx by Yas au Halopesa. Salio linaongezwa malipo yakithibitishwa."
                    : "Snippe haijaunganishwa; ununuzi wa SMS haupatikani kwa sasa."}
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="mb-4">
              <h3 className="font-semibold text-ink">Nunua SMS</h3>
              <p className="mt-1 text-sm text-ink-3">Chagua idadi na uthibitishe ombi la USSD kwenye simu yako.</p>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-2" aria-label="Chagua idadi ya SMS">
              {purchaseOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnits(option)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                    units === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line bg-surface text-ink-2 hover:border-primary/30"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <form onSubmit={requestPurchase} className="space-y-3">
              <Input
                label="Idadi ya SMS"
                name="idadi_sms"
                type="number"
                min={25}
                max={100000}
                value={units}
                onChange={(event) => setUnits(Math.max(0, Number(event.target.value)))}
                required
              />
              <Input
                label="Namba ya simu ya malipo"
                name="namba_malipo"
                type="tel"
                inputMode="tel"
                placeholder="Mf. 0712345678"
                value={paymentPhone}
                onChange={(event) => setPaymentPhone(event.target.value)}
                hint="Utapokea ombi la Snippe la kuingiza PIN."
                required
              />

              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
                <span className="text-sm text-ink-3">Jumla ya kulipa</span>
                <strong className="text-lg text-ink">TZS {total.toLocaleString("en-TZ")}</strong>
              </div>

              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

              <Button type="submit" loading={purchaseBusy} disabled={!account.snippeConfigured || units < 25 || !paymentPhone.trim()} className="w-full" icon={<Smartphone />}>
                Lipa kwa Snippe
              </Button>
            </form>
          </section>
        </div>

        {account.purchases.length > 0 && (
          <section className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="size-4 text-ink-3" />
              <h3 className="text-sm font-semibold text-ink">Manunuzi ya karibuni</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-ink-3">
                  <tr>
                    <th className="pb-2 font-medium">Tarehe</th>
                    <th className="pb-2 font-medium">SMS</th>
                    <th className="pb-2 font-medium">Jumla</th>
                    <th className="pb-2 font-medium">Kumbukumbu</th>
                    <th className="pb-2 text-right font-medium">Hali / Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {account.purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="py-3 text-ink-2">{new Date(purchase.createdAt).toLocaleDateString("sw-TZ")}</td>
                      <td className="py-3 font-semibold text-ink">{purchase.units.toLocaleString("en-TZ")}</td>
                      <td className="py-3 text-ink-2">TZS {purchase.total.toLocaleString("en-TZ")}</td>
                      <td className="py-3 text-ink-3">{purchase.reference || "—"}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`badge ${purchase.status === "PAID" ? "badge-done" : purchase.status === "PENDING" ? "badge-wait" : "badge-danger"}`}>
                            {statusLabel(purchase.status)}
                          </span>
                          {purchase.status === "PENDING" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              loading={checkingId === purchase.id}
                              onClick={() => checkPurchase(purchase)}
                              icon={<RefreshCw />}
                            >
                              Kagua
                            </Button>
                          )}
                          {purchase.status === "PENDING" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              loading={cancelBusyId === purchase.id}
                              onClick={() => cancelPurchase(purchase)}
                              icon={<XCircle />}
                            >
                              Ghairi
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </CardBody>
    </Card>
  );
}
