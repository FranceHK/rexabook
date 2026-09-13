"use client";

export interface ChartPoint {
  label: string;
  value: number;
}

/** Lightweight CSS bar chart for the "Malipo kwa kila siku" card. */
export function PaymentsChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d, i) => {
        const h = Math.max(3, Math.round((d.value / max) * 100));
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] font-medium text-ink-2 opacity-0 transition group-hover:opacity-100">
              {d.value > 0 ? d.value.toLocaleString("en-TZ") : ""}
            </span>
            <div
              className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
              style={{ height: `${h}%`, background: "linear-gradient(180deg, var(--primary), var(--primary-2))" }}
            />
            <span className="whitespace-nowrap text-[11px] text-ink-3">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}