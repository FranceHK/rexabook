"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Building2, CalendarDays, Ellipsis, Megaphone, Plus, ReceiptText, Tags, Truck, Users, WalletCards, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createExpenseAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarList } from "@/components/reports/report-charts";
import { useToast } from "@/components/theme/toast-provider";

export interface ExpensesPanelExpense {
  id: number;
  category: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

const CATEGORIES: Array<{ id: string; icon: LucideIcon }> = [
  { id: "Usafiri", icon: Truck },
  { id: "Kodi", icon: Building2 },
  { id: "Mishahara", icon: Users },
  { id: "Umeme/Maji", icon: Zap },
  { id: "Masoko", icon: Megaphone },
  { id: "Stock", icon: Boxes },
  { id: "Mengine", icon: Ellipsis },
];
const iconFor = (category: string): LucideIcon => CATEGORIES.find((item) => item.id === category)?.icon ?? Tags;

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;
const date = (value: string) => new Date(value).toLocaleDateString("sw-TZ", { day: "2-digit", month: "short", year: "numeric" });

export function ExpensesPanel({ expenses, monthTotal, locked }: { expenses: ExpensesPanelExpense[]; monthTotal: number; locked: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);
  const visible = filter ? expenses.filter((expense) => expense.category === filter) : expenses;
  const visibleTotal = visible.reduce((sum, expense) => sum + expense.amount, 0);
  const largest = expenses.reduce<ExpensesPanelExpense | null>((top, expense) => (!top || expense.amount > top.amount ? expense : top), null);

  async function save(form: HTMLFormElement) {
    setBusy(true);
    const result = await createExpenseAction(null, new FormData(form));
    setBusy(false);
    toast(result.message, result.success ? "success" : "error");
    if (result.success) {
      form.reset();
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        {([
          ["Matumizi ya mwezi huu", money(monthTotal), WalletCards, "bg-primary/10 text-primary"],
          ["Aina inayoongoza", byCategory[0] ? `${byCategory[0].label} · ${money(byCategory[0].value)}` : "-", Tags, "bg-primary-2/10 text-primary-2"],
          ["Tumizi kubwa zaidi", largest ? `${money(largest.amount)} · ${largest.category}` : "-", ReceiptText, "bg-warning/10 text-warning"],
        ] as const).map(([label, value, Icon, tone]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="min-w-0"><p className="text-xs font-medium uppercase text-ink-3">{label}</p><p className="mt-2 truncate text-lg font-semibold text-ink">{value}</p></div>
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="size-5" /></span>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary-2 px-5 py-4 text-white">
              <p className="flex items-center gap-2 text-base font-semibold"><WalletCards className="size-5" /> Rekodi Matumizi</p>
              <p className="mt-1 text-xs text-white/85">Chagua aina, weka kiasi, kisha hifadhi.</p>
            </div>
            <CardBody>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save(event.currentTarget);
                }}
              >
                <input type="hidden" name="aina" value={category} />
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-2">Aina ya matumizi</p>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(({ id, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCategory(id)}
                        aria-pressed={category === id}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 px-1 py-2.5 text-[11px] font-medium transition ${
                          category === id ? "border-primary bg-primary/10 text-primary" : "border-line text-ink-2 hover:border-primary/40"
                        }`}
                      >
                        <Icon className="size-4" /> {id}
                      </button>
                    ))}
                  </div>
                </div>
                <Input label="Kiasi (TZS)" name="kiasi" type="number" min="1" placeholder="mf. 25000" required />
                <Input label="Maelezo (hiari)" name="maelezo" placeholder="mf. Nauli ya kupeleka mzigo" />
                <Button type="submit" loading={busy} disabled={locked} icon={<Plus />} className="w-full">Hifadhi Matumizi</Button>
                {locked && <p className="text-center text-xs text-danger">Subscription imeisha. Kurekodi matumizi kumefungwa.</p>}
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mgawanyo kwa aina" />
            <CardBody><BarList items={byCategory} color="var(--chart-1)" emptyText="Hakuna matumizi bado." /></CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Matumizi ya Karibuni" action={<span className="badge badge-info">{visible.length} · {money(visibleTotal)}</span>} />
          <CardBody>
            {expenses.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[null, ...byCategory.map((item) => item.label)].map((item) => (
                  <button
                    key={item ?? "zote"}
                    type="button"
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === item ? "border-primary bg-primary text-white" : "border-line text-ink-2 hover:border-primary/40"}`}
                  >
                    {item ?? "Zote"}
                  </button>
                ))}
              </div>
            )}
            {visible.length === 0 ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-sm text-ink-3"><WalletCards className="size-8" /> Hakuna matumizi bado.</div>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {visible.map((expense) => {
                  const Icon = iconFor(expense.category);
                  return (
                    <li key={expense.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{expense.category}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-ink-3"><CalendarDays className="size-3.5 shrink-0" /> {date(expense.createdAt)} · {expense.note || "Bila maelezo"}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-ink">{money(expense.amount)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
