"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, UserRoundPlus } from "lucide-react";
import { createSalesPersonAction, markCommissionsPaidAction, toggleSalesPersonAction } from "@/actions/sales-agents";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

export interface SalesAdminRow {
  id: number;
  name: string;
  phone: string | null;
  code: string;
  active: boolean;
  customers: number;
  payingCustomers: number;
  earned: number;
  unpaid: number;
}

const money = (value: number) => `TZS ${value.toLocaleString("en-TZ")}`;

export function SalesAdminView({ rows, commissionPercent }: { rows: SalesAdminRow[]; commissionPercent: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<{ success: boolean; message: string }>) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) router.refresh();
    return result.success;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader title="Ongeza Sales Person" />
        <CardBody>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              void run("create", () => createSalesPersonAction(null, new FormData(form))).then((created) => { if (created) form.reset(); });
            }}
          >
            <Input label="Jina la kuingia" name="jina" maxLength={100} required />
            <Input label="Namba ya simu" name="simu" type="tel" placeholder="0712345678" maxLength={20} />
            <Input label="Nenosiri la kuanzia" name="nenosiri" type="password" minLength={6} required />
            <p className="text-xs text-ink-3">Ataingia kwa ukurasa ule ule wa login. Atapata referral code yake na {commissionPercent}% ya kila malipo ya subscription ya mteja aliyemleta.</p>
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
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{row.name} <span className="badge badge-info ml-2">{row.code}</span></p>
                    <p className="text-xs text-ink-3">{row.phone || "Hana namba"} · Wateja {row.customers} (waliolipa {row.payingCustomers})</p>
                    <p className="mt-1 text-xs text-ink-3">Commission jumla {money(row.earned)} · <span className={row.unpaid > 0 ? "font-semibold text-danger" : ""}>Anadai {money(row.unpaid)}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Button size="sm" variant="outline" loading={busy === `toggle-${row.id}`} onClick={() => void run(`toggle-${row.id}`, () => toggleSalesPersonAction(row.id))}>
                      {row.active ? "Zuia" : "Ruhusu"}
                    </Button>
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
