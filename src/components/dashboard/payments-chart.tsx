"use client";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Lightweight CSS bar chart for the "Malipo kwa kila siku" card.
 * Bars grow in on mount, show the amount on hover, and grid lines hint scale.
 */
export function PaymentsChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const last = data.length - 1;

  return (
    <div aria-label="Malipo kwa kila siku">
      <div className="mb-3 flex items-end justify-between">
        <p className="text-sm text-ink-2">Wiki hii</p>
        <p className="text-sm font-semibold text-ink">
          {total > 0 ? "TZS " + total.toLocaleString("en-TZ") : "—"}
        </p>
      </div>

      <div
        className="relative flex h-36 items-end gap-1.5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to top, var(--line) 0, var(--line) 1px, transparent 1px, transparent 33.33%)",
        }}
      >
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.value / max) * 100));
          const isPeak = d.value === max && d.value > 0;
          const isToday = i === last;
          return (
            <div key={i} className="group relative flex h-full flex-1 items-end" role="presentation">
              {/* hover tooltip */}
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink opacity-0 shadow-glass transition group-hover:opacity-100">
                {d.label}: TZS{" "}
                {d.value > 0 ? d.value.toLocaleString("en-TZ") : "—"}
              </div>
              <div
                className="bar-in w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                style={{
                  height: `${h}%`,
                  background: isToday
                    ? "linear-gradient(180deg, var(--info), var(--info))"
                    : isPeak
                      ? "linear-gradient(180deg, var(--success), color-mix(in srgb, var(--success) 55%, var(--primary)))"
                      : "linear-gradient(180deg, var(--primary-2), var(--primary))",
                  boxShadow: isPeak
                    ? "0 4px 14px color-mix(in srgb, var(--success) 40%, transparent)"
                    : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-ink-3">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}