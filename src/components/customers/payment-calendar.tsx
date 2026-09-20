"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { fmtPesa, fmtTarehe } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface PaymentCalendarEntry {
  id: number;
  amount: number;
  date: string;
  product: string;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("sw-TZ", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

export function PaymentCalendar({ payments }: { payments: PaymentCalendarEntry[] }) {
  const latestPayment = useMemo(() => {
    if (payments.length === 0) return new Date();
    return payments.reduce((latest, payment) => {
      const date = new Date(payment.date);
      return date > latest ? date : latest;
    }, new Date(payments[0].date));
  }, [payments]);

  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: latestPayment.getFullYear(),
    month: latestPayment.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    payments.length > 0 ? dateKey(latestPayment) : null
  );

  const paymentsByDate = useMemo(() => {
    const grouped = new Map<string, PaymentCalendarEntry[]>();
    payments.forEach((payment) => {
      const key = dateKey(new Date(payment.date));
      grouped.set(key, [...(grouped.get(key) ?? []), payment]);
    });
    return grouped;
  }, [payments]);

  const firstDay = new Date(visibleMonth.year, visibleMonth.month, 1).getDay();
  const daysInMonth = new Date(visibleMonth.year, visibleMonth.month + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1
  );
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectedPayments = selectedDate ? paymentsByDate.get(selectedDate) ?? [] : [];
  const selectedTotal = selectedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  function changeMonth(delta: number) {
    const next = new Date(visibleMonth.year, visibleMonth.month + delta, 1);
    setVisibleMonth({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(null);
  }

  return (
    <aside className="panel overflow-hidden min-[1100px]:sticky min-[1100px]:top-8">
      <div className="border-b border-line px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-success/10 text-success">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Kalenda ya Malipo</h2>
            <p className="text-xs text-ink-3">Siku za kijani zina malipo</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-primary"
            aria-label="Mwezi uliopita"
            title="Mwezi uliopita"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="capitalize text-sm font-semibold text-ink">{monthLabel(visibleMonth.year, visibleMonth.month)}</p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="grid size-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-primary"
            aria-label="Mwezi unaofuata"
            title="Mwezi unaofuata"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-ink-3">
          {['Jp', 'Jt', 'J3', 'J4', 'J5', 'Al', 'Jm'].map((day) => (
            <span key={day} className="py-1.5">{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, index) => {
            if (day === null) return <span key={`empty-${index}`} className="aspect-square" aria-hidden />;
            const key = dateKey(new Date(visibleMonth.year, visibleMonth.month, day));
            const hasPayment = paymentsByDate.has(key);
            const isSelected = selectedDate === key;
            return (
              <button
                key={key}
                type="button"
                disabled={!hasPayment}
                onClick={() => setSelectedDate(key)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-md text-xs font-medium transition",
                  hasPayment
                    ? "bg-success/12 text-success hover:bg-success/20"
                    : "cursor-default text-ink-2 hover:bg-transparent",
                  isSelected && "bg-success text-white shadow-sm hover:bg-success"
                )}
                aria-label={hasPayment ? `Angalia malipo ya tarehe ${day}` : undefined}
              >
                {day}
                {hasPayment && !isSelected ? <span className="absolute bottom-1 size-1 rounded-full bg-success" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {selectedDate && selectedPayments.length > 0 ? (
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-3">Malipo ya {fmtTarehe(`${selectedDate}T12:00:00`)}</p>
                  <p className="mt-0.5 text-lg font-semibold text-success">{fmtPesa(selectedTotal)}</p>
                </div>
                <span className="badge badge-done">{selectedPayments.length} malipo</span>
              </div>
              <div className="space-y-2">
                {selectedPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <ReceiptText className="size-3.5 shrink-0 text-success" />
                      <span className="truncate text-xs font-medium text-ink-2">{payment.product}</span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-success">{fmtPesa(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-3 text-center">
              <CalendarDays className="mx-auto mb-2 size-5 text-ink-3" />
              <p className="text-xs leading-relaxed text-ink-3">
                {payments.length === 0 ? "Hakuna malipo yaliyorekodiwa bado." : "Chagua siku ya kijani kuona kiasi na bidhaa."}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
