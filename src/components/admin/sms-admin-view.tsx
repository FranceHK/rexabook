"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  CircleDollarSign,
  MessageSquareText,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  adjustSmsBalanceAction,
  approveSmsPurchaseAction,
  checkSmsPurchaseStatusAction,
  rejectSmsPurchaseAction,
} from "@/actions/sms";
import { deleteUserAction } from "@/actions/settings";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

export interface SmsAdminStats {
  users: number;
  soldUnits: number;
  sentUnits: number;
  sales: number;
  providerCost: number;
  profit: number;
  pendingOrders: number;
  pendingValue: number;
  userBalanceTotal: number;
}

interface MesejiProviderStats {
  username: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: string;
  balance: number;
  rate: number;
}

async function fetchProviderStats(signal?: AbortSignal): Promise<MesejiProviderStats> {
  const response = await fetch("/api/admin/meseji-stats", { signal });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Takwimu hazijapatikana.");
  return payload as MesejiProviderStats;
}

export interface SmsAdminPurchase {
  id: number;
  userName: string;
  shopName: string;
  units: number;
  total: number;
  providerCost: number;
  profit: number;
  reference?: string | null;
  paymentProvider?: string | null;
  status: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "FAILED";
  createdAt: string;
}

export interface SmsAdminUser {
  id: number;
  name: string;
  shopName: string;
  role: "USER" | "ADMIN";
  smsEnabled: boolean;
  smsBalance: number;
  sentUnits: number;
  isCurrent: boolean;
}

function money(value: number): string {
  return `TZS ${value.toLocaleString("en-TZ")}`;
}

export function SmsAdminView({
  stats,
  purchases,
  users,
  providerConfigured,
}: {
  stats: SmsAdminStats;
  purchases: SmsAdminPurchase[];
  users: SmsAdminUser[];
  providerConfigured: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState("10");
  const [providerStats, setProviderStats] = useState<MesejiProviderStats | null>(null);
  const [providerLoading, setProviderLoading] = useState(providerConfigured);
  const [providerError, setProviderError] = useState<string | null>(null);

  async function refreshProviderStats() {
    if (!providerConfigured) return;
    setProviderLoading(true);
    setProviderError(null);
    try {
      setProviderStats(await fetchProviderStats());
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Takwimu hazijapatikana.");
    } finally {
      setProviderLoading(false);
    }
  }

  useEffect(() => {
    if (!providerConfigured) return;
    const controller = new AbortController();
    void fetchProviderStats(controller.signal)
      .then((payload) => {
        setProviderStats(payload);
        setProviderError(null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProviderError(error instanceof Error ? error.message : "Takwimu hazijapatikana.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setProviderLoading(false);
      });
    return () => controller.abort();
  }, [providerConfigured]);

  async function approve(id: number) {
    setBusyId(id);
    const result = await approveSmsPurchaseAction(id);
    setBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
  }

  async function checkPayment(id: number) {
    setBusyId(id);
    const result = await checkSmsPurchaseStatusAction(id);
    setBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    router.refresh();
  }

  async function reject(id: number) {
    if (!window.confirm("Unataka kukataa ombi hili la ununuzi wa SMS?")) return;
    setBusyId(id);
    const result = await rejectSmsPurchaseAction(id);
    setBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
  }

  async function adjust(userId: number) {
    const units = Number(adjustment);
    setBusyId(userId);
    const result = await adjustSmsBalanceAction(userId, units, "Marekebisho ya admin");
    setBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      setAdjustingId(null);
      setAdjustment("10");
      router.refresh();
    }
  }

  async function deleteAccount(user: SmsAdminUser) {
    if (!window.confirm(`Futa akaunti ya ${user.name} na data yake yote? Hatua hii hairudi nyuma.`)) return;
    setBusyId(user.id);
    const result = await deleteUserAction(user.id);
    setBusyId(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
  }

  const statItems = [
    { label: "Mauzo ya SMS", value: money(stats.sales), hint: `${stats.soldUnits.toLocaleString("en-TZ")} SMS`, icon: CircleDollarSign, tone: "text-primary bg-primary/10" },
    { label: "Gharama ya Meseji", value: money(stats.providerCost), hint: "TZS 15 kwa SMS", icon: BadgeDollarSign, tone: "text-warning bg-warning/10" },
    { label: "Faida ya Admin", value: money(stats.profit), hint: "TZS 5 kwa SMS", icon: TrendingUp, tone: "text-success bg-success/10" },
    { label: "Zilizotumwa", value: stats.sentUnits.toLocaleString("en-TZ"), hint: "vipande vilivyofanikiwa", icon: MessageSquareText, tone: "text-info bg-info/10" },
  ];

  const providerAvailable = Math.max(0, Math.floor(providerStats?.balance ?? 0));
  const providerTotal = providerAvailable + Math.max(0, providerStats?.totalSent ?? 0);
  const providerCoverage = providerAvailable - stats.userBalanceTotal;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-lg bg-danger/10 text-danger">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Admin SMS</h1>
            <p className="mt-1 text-sm text-ink-3">Mauzo, salio za watumiaji, gharama na faida ya SMS.</p>
          </div>
        </div>
        <span className={`badge ${providerConfigured ? "badge-done" : "badge-danger"}`}>
          Meseji {providerConfigured ? "imeunganishwa" : "haijaunganishwa"}
        </span>
      </header>

      <Card className="mb-5">
        <CardHeader
          title={
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-info/10 text-info"><Server className="size-4" /></span>
              Hifadhi ya Meseji
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => void refreshProviderStats()}
              disabled={!providerConfigured || providerLoading}
              className="grid size-9 place-items-center rounded-lg border border-line text-ink-3 transition hover:text-primary disabled:opacity-50"
              aria-label="Sasisha takwimu za Meseji"
              title="Sasisha"
            >
              <RefreshCw className={`size-4 ${providerLoading ? "animate-spin" : ""}`} />
            </button>
          }
        />
        <CardBody>
          {!providerConfigured ? (
            <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">Weka credentials za Meseji ili kuona salio la provider.</p>
          ) : providerError ? (
            <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{providerError}</p>
          ) : (
            <>
              <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
                <div className="bg-surface p-4">
                  <p className="text-xs font-medium uppercase text-ink-3">Jumla ya Meseji</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{providerLoading ? "…" : providerTotal.toLocaleString("en-TZ")}</p>
                  <p className="mt-1 text-xs text-ink-3">zilizotumwa + salio lililopo</p>
                </div>
                <div className="bg-surface p-4">
                  <p className="text-xs font-medium uppercase text-ink-3">Zilizouzwa</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{stats.soldUnits.toLocaleString("en-TZ")}</p>
                  <p className="mt-1 text-xs text-ink-3">zilizolipiwa na watumiaji</p>
                </div>
                <div className="bg-surface p-4">
                  <p className="text-xs font-medium uppercase text-ink-3">Zimebaki Meseji</p>
                  <p className="mt-2 text-2xl font-semibold text-success">{providerLoading ? "…" : providerAvailable.toLocaleString("en-TZ")}</p>
                  <p className="mt-1 text-xs text-ink-3">salio la provider sasa</p>
                </div>
                <div className="bg-surface p-4">
                  <p className="text-xs font-medium uppercase text-ink-3">Salio kwa Watumiaji</p>
                  <p className="mt-2 text-2xl font-semibold text-warning">{stats.userBalanceTotal.toLocaleString("en-TZ")}</p>
                  <p className="mt-1 text-xs text-ink-3">SMS ambazo bado hawajatumia</p>
                </div>
              </div>
              {providerStats && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-ink-3">
                    Akaunti <strong className="text-ink">{providerStats.username}</strong> · Zimetumwa {providerStats.totalSent.toLocaleString("en-TZ")} · Zimefika {providerStats.totalDelivered.toLocaleString("en-TZ")} · Mafanikio {providerStats.successRate}
                  </p>
                  <span className={`badge ${providerCoverage >= 0 ? "badge-done" : "badge-danger"}`}>
                    Akiba baada ya salio za wateja: {providerCoverage.toLocaleString("en-TZ")}
                  </span>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-ink-3">{label}</p>
                <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-ink-3">{hint}</p>
              </div>
              <span className={`grid size-9 place-items-center rounded-lg ${tone}`}><Icon className="size-4" /></span>
            </div>
          </div>
        ))}
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <Users className="size-5 text-primary" />
          <div><p className="text-lg font-semibold text-ink">{stats.users}</p><p className="text-xs text-ink-3">Watumiaji</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <WalletCards className="size-5 text-warning" />
          <div><p className="text-lg font-semibold text-ink">{stats.pendingOrders}</p><p className="text-xs text-ink-3">Maombi yanayosubiri</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <CircleDollarSign className="size-5 text-success" />
          <div><p className="text-lg font-semibold text-ink">{money(stats.pendingValue)}</p><p className="text-xs text-ink-3">Thamani inayosubiri</p></div>
        </div>
      </div>

      <Card className="mb-5">
        <CardHeader title="Maombi ya Ununuzi" action={<span className="badge badge-wait">{stats.pendingOrders} yanasubiri</span>} />
        <CardBody className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-medium">Mtumiaji</th>
                  <th className="px-4 py-3 font-medium">SMS</th>
                  <th className="px-4 py-3 font-medium">Mauzo</th>
                  <th className="px-4 py-3 font-medium">Gharama</th>
                  <th className="px-4 py-3 font-medium">Faida</th>
                  <th className="px-4 py-3 font-medium">Kumbukumbu</th>
                  <th className="px-5 py-3 text-right font-medium">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {purchases.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-3">Hakuna maombi ya ununuzi bado.</td></tr>
                ) : purchases.map((purchase) => (
                  <tr key={purchase.id} className={purchase.status === "PENDING" ? "bg-warning/5" : undefined}>
                    <td className="px-5 py-3"><p className="font-semibold text-ink">{purchase.userName}</p><p className="text-xs text-ink-3">{purchase.shopName} · {new Date(purchase.createdAt).toLocaleDateString("sw-TZ")}</p></td>
                    <td className="px-4 py-3 font-semibold text-ink">{purchase.units.toLocaleString("en-TZ")}</td>
                    <td className="px-4 py-3 text-ink-2">{money(purchase.total)}</td>
                    <td className="px-4 py-3 text-ink-2">{money(purchase.providerCost)}</td>
                    <td className="px-4 py-3 font-semibold text-success">{money(purchase.profit)}</td>
                    <td className="px-4 py-3 text-ink-3">{purchase.reference || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {purchase.status === "PENDING" ? <>
                          {purchase.paymentProvider === "SNIPPE" ? (
                            <Button size="sm" variant="outline" loading={busyId === purchase.id} onClick={() => checkPayment(purchase.id)} icon={<RefreshCw />}>Kagua Snippe</Button>
                          ) : (
                            <Button size="sm" variant="success" loading={busyId === purchase.id} onClick={() => approve(purchase.id)}>Thibitisha</Button>
                          )}
                          {purchase.paymentProvider !== "SNIPPE" && (
                            <Button size="sm" variant="ghost" disabled={busyId === purchase.id} onClick={() => reject(purchase.id)} icon={<X />}>Kataa</Button>
                          )}
                        </> : <span className={`badge ${purchase.status === "PAID" ? "badge-done" : "badge-danger"}`}>{purchase.status === "PAID" ? "Imelipwa" : purchase.status === "CANCELLED" ? "Imeghairiwa" : "Imekataliwa"}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Watumiaji na Salio" action={<span className="badge badge-info">{users.length} akaunti</span>} />
        <CardBody className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-medium">Akaunti</th>
                  <th className="px-4 py-3 font-medium">SMS</th>
                  <th className="px-4 py-3 font-medium">Salio</th>
                  <th className="px-4 py-3 font-medium">Zimetumwa</th>
                  <th className="px-5 py-3 text-right font-medium">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3"><p className="font-semibold text-ink">{user.name} {user.isCurrent && <span className="badge badge-info ml-2">Wewe</span>}</p><p className="text-xs text-ink-3">{user.shopName} · {user.role === "ADMIN" ? "Admin" : "Mtumiaji"}</p></td>
                    <td className="px-4 py-3"><span className={`badge ${user.smsEnabled ? "badge-done" : "badge-wait"}`}>{user.smsEnabled ? "Zimewashwa" : "Zimezimwa"}</span></td>
                    <td className="px-4 py-3 text-base font-semibold text-ink">{user.smsBalance.toLocaleString("en-TZ")}</td>
                    <td className="px-4 py-3 text-ink-2">{user.sentUnits.toLocaleString("en-TZ")}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {adjustingId === user.id ? <>
                          <Input aria-label={`Marekebisho ya ${user.name}`} type="number" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} className="h-9 w-24" />
                          <Button size="sm" loading={busyId === user.id} onClick={() => adjust(user.id)}>Weka</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)} icon={<X />} aria-label="Funga" />
                        </> : <>
                          <Button size="sm" variant="outline" onClick={() => setAdjustingId(user.id)}>Rekebisha</Button>
                          {!user.isCurrent && user.role !== "ADMIN" && (
                            <Button size="sm" variant="ghost" disabled={busyId === user.id} onClick={() => deleteAccount(user)} icon={<Trash2 />} aria-label={`Futa ${user.name}`} />
                          )}
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
