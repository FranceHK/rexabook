"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Copy, KeyRound, MessageSquareText, Pencil, Save, UserRoundPlus, X } from "lucide-react";
import {
  createSalesPersonAction,
  markCommissionsPaidAction,
  resetSalesPasswordAction,
  toggleSalesPersonAction,
  updateSalesPersonAction,
  type SalesCredentials,
} from "@/actions/sales-agents";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TANZANIA_REGIONS } from "@/lib/regions";
import { useToast } from "@/components/theme/toast-provider";

export interface SalesAdminCustomer {
  id: number;
  shop: string;
  username: string;
  joinedAt: string;
  active: boolean;
  status: string;
  paid: number;
  commission: number;
}

export interface SalesAdminRow {
  id: number;
  name: string;
  phone: string | null;
  code: string;
  active: boolean;
  fullName: string | null;
  email: string | null;
  region: string | null;
  /** The password the admin issued, while the sales person still uses it; null once they set their own. */
  starterPassword: string | null;
  payingCustomers: number;
  earned: number;
  unpaid: number;
  customers: SalesAdminCustomer[];
}

const money = (value: number) => `TZS ${value.toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

function loginMessage(credentials: Omit<SalesCredentials, "password"> & { password: string | null }): string {
  return [
    `Habari ${credentials.username}, akaunti yako ya RexaBook Sales iko tayari.`,
    `Ingia hapa: ${window.location.origin}/login`,
    `Jina la kuingia: ${credentials.username}`,
    credentials.password ? `Nenosiri: ${credentials.password}` : "Nenosiri: lile uliloliweka mwenyewe",
    "Ukiingia, jaza majina yako matatu, email na mkoa uliopo ili uanze kazi.",
    `Referral code yako: ${credentials.code}`,
  ].join("\n");
}

export function SalesAdminView({ rows, commissionPercent }: { rows: SalesAdminRow[]; commissionPercent: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<SalesAdminRow | null>(null);

  async function run<T extends { success: boolean; message: string }>(key: string, action: () => Promise<T>): Promise<T> {
    setBusy(key);
    const result = await action();
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
    return result;
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      toast("Ujumbe umenakiliwa. Ubandike kwenye SMS.", "success");
    } catch {
      toast("Imeshindikana kunakili. Chagua maandishi unakili mwenyewe.", "error");
    }
  }

  return (
    <div className="space-y-5">
      {message && (
        <Card>
          <CardHeader
            title="Ujumbe wa kumtumia sales person"
            action={<button type="button" onClick={() => setMessage(null)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2" aria-label="Funga"><X className="size-4" /></button>}
          />
          <CardBody>
            <textarea readOnly value={message} rows={6} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-line bg-surface-2 p-3 font-mono text-sm text-ink" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-3">Kuufungua ujumbe huu hakubadilishi nenosiri.</p>
              <Button icon={<Copy />} onClick={() => void copyMessage()}>Nakili ujumbe</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Ongeza Sales Person" />
          <CardBody>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                void run("create", () => createSalesPersonAction(null, new FormData(form))).then((result) => {
                  if (!result.success) return;
                  form.reset();
                  if (result.credentials) setMessage(loginMessage(result.credentials));
                });
              }}
            >
              <Input label="Jina la kuingia" name="jina" maxLength={100} required />
              <Input label="Email" name="email" type="email" placeholder="jina@mfano.com" maxLength={150} />
              <Input label="Namba ya simu" name="simu" type="tel" placeholder="0712345678" maxLength={20} />
              <p className="text-xs text-ink-3">Mfumo utamtengenezea nenosiri la kuanzia na referral code, kisha utapata ujumbe wa kunakili umtumie kwa SMS. Majina kamili na mkoa atajaza mwenyewe akiingia. Atapata {commissionPercent}% ya kila malipo ya subscription ya mteja aliyemleta.</p>
              <Button type="submit" loading={busy === "create"} icon={<UserRoundPlus />} className="w-full">Ongeza</Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sales Persons" action={<span className="badge badge-info">{rows.length}</span>} />
          <CardBody className="!p-0">
            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-3">Hakuna sales person aliyeongezwa.</p>
            ) : (
              <div className="divide-y divide-line">
                {rows.map((row) => (
                  <div key={row.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{row.fullName || row.name} <span className="badge badge-info ml-2">{row.code}</span></p>
                        <p className="text-xs text-ink-3">Login: {row.name} · {row.email || "Hana email"} · {row.region || "Mkoa haujajazwa"}</p>
                        <p className="text-xs text-ink-3">{row.phone || "Hana namba"} · Wateja {row.customers.length} (waliolipa {row.payingCustomers})</p>
                        <p className="mt-1 text-xs text-ink-3">Commission jumla {money(row.earned)} · <span className={row.unpaid > 0 ? "font-semibold text-danger" : ""}>Anadai {money(row.unpaid)}</span></p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!(row.fullName && row.email && row.region) && <span className="badge badge-wait">Hajakamilisha taarifa</span>}
                        <span className={`badge ${row.active ? "badge-done" : "badge-danger"}`}>{row.active ? "Hai" : "Amezuiwa"}</span>
                        {row.unpaid > 0 && (
                          <Button
                            size="sm"
                            loading={busy === `pay-${row.id}`}
                            icon={<BadgeCheck />}
                            onClick={() => {
                              if (window.confirm(`Thibitisha umemlipa ${row.name} ${money(row.unpaid)}?`)) void run(`pay-${row.id}`, () => markCommissionsPaidAction(row.id));
                            }}
                          >
                            Nimemlipa
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<MessageSquareText />}
                          onClick={() => setMessage(loginMessage({ username: row.name, password: row.starterPassword, code: row.code }))}
                        >
                          Ujumbe wa login
                        </Button>
                        <Button size="sm" variant="outline" icon={<Pencil />} onClick={() => setEditing(row)}>Hariri</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busy === `reset-${row.id}`}
                          icon={<KeyRound />}
                          onClick={() => {
                            if (!window.confirm(`Mpe ${row.name} nenosiri jipya? La sasa litaacha kufanya kazi. Tumia hii akiwa amelisahau tu.`)) return;
                            void run(`reset-${row.id}`, () => resetSalesPasswordAction(row.id)).then((result) => {
                              if (result.success && result.credentials) setMessage(loginMessage(result.credentials));
                            });
                          }}
                        >
                          Nenosiri jipya
                        </Button>
                        <Button size="sm" variant="outline" loading={busy === `toggle-${row.id}`} onClick={() => void run(`toggle-${row.id}`, () => toggleSalesPersonAction(row.id))}>
                          {row.active ? "Zuia" : "Ruhusu"}
                        </Button>
                      </div>
                    </div>

                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-primary">Wateja wake ({row.customers.length})</summary>
                      {row.customers.length === 0 ? (
                        <p className="mt-2 text-sm text-ink-3">Bado hajaunganisha mteja.</p>
                      ) : (
                        <div className="mt-2 divide-y divide-line rounded-lg border border-line">
                          {row.customers.map((customer) => (
                            <div key={customer.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">{customer.shop}</p>
                                <p className="text-xs text-ink-3">{customer.username} · Alijiunga {date(customer.joinedAt)} · Amelipa {money(customer.paid)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-success">{money(customer.commission)}</p>
                                <span className={`badge ${customer.active ? "badge-done" : "badge-danger"}`}>{customer.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Hariri Sales Person" subtitle={editing ? `Referral code ${editing.code}` : undefined}>
        {editing && (
          <form
            key={editing.id}
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void run("edit", () => updateSalesPersonAction(editing.id, new FormData(form))).then((result) => { if (result.success) setEditing(null); });
            }}
          >
            <Input label="Majina kamili" name="jina_kamili" defaultValue={editing.fullName ?? ""} maxLength={150} />
            <Input label="Email" name="email" type="email" defaultValue={editing.email ?? ""} maxLength={150} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Mkoa" name="mkoa" defaultValue={editing.region ?? ""}>
                <option value="">Haujachaguliwa</option>
                {TANZANIA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
              </Select>
              <Input label="Namba ya simu" name="simu" type="tel" defaultValue={editing.phone ?? ""} maxLength={20} />
            </div>
            <Input label="Jina la kuingia" name="jina" defaultValue={editing.name} maxLength={100} required />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Ghairi</Button>
              <Button type="submit" loading={busy === "edit"} icon={<Save />}>Hifadhi</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
