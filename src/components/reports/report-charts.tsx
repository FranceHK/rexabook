"use client";

import { useState } from "react";

export interface ChartSeries {
  label: string;
  /** A --chart-N custom property, so light and dark themes each get their own validated step. */
  color: string;
}

const money = (value: number) => `TZS ${Math.round(value).toLocaleString("en-TZ")}`;

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

/** Rounds the axis top up to 1, 2, 2.5 or 5 × 10ⁿ so the gridlines land on readable amounts. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

function Legend({ series }: { series: ChartSeries[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="h-0.5 w-4 rounded-full" style={{ background: item.color }} aria-hidden /> {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Line chart on one shared money axis. The SVG stretches with its container, so
 * every label is HTML and stays the same size on a phone as on a desktop.
 */
export function TrendChart({ series, data }: { series: ChartSeries[]; data: Array<{ label: string; values: number[] }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.flatMap((point) => point.values)));
  const empty = data.every((point) => point.values.every((value) => value === 0));
  const x = (index: number) => (data.length === 1 ? 50 : (index / (data.length - 1)) * 100);
  const y = (value: number) => 100 - (value / max) * 100;
  // Roughly six x labels, always including the first and last bucket.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  function locate(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(fraction * (data.length - 1)));
  }

  return (
    <div>
      <Legend series={series} />
      <div className="flex gap-2">
        <div className="flex h-52 w-9 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-ink-3" aria-hidden>
          <span>{compact(max)}</span>
          <span>{compact(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="relative h-52 touch-pan-y"
            onPointerMove={locate}
            onPointerDown={locate}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Mwenendo: ${series.map((item) => item.label).join(" na ")}`}
          >
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
              <span className="border-t border-dashed border-line" />
              <span className="border-t border-dashed border-line" />
              <span className="border-t border-line-2" />
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              {series.length === 1 && (
                <polygon
                  points={`0,100 ${data.map((point, index) => `${x(index)},${y(point.values[0])}`).join(" ")} 100,100`}
                  fill={series[0].color}
                  opacity={0.12}
                />
              )}
              {series.map((item, seriesIndex) => (
                <polyline
                  key={item.label}
                  points={data.map((point, index) => `${x(index)},${y(point.values[seriesIndex])}`).join(" ")}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {empty && <p className="absolute inset-0 grid place-items-center text-sm text-ink-3">Hakuna data kwa kipindi hiki.</p>}
            {hover !== null && !empty && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-line-2" style={{ left: `${x(hover)}%` }} />
                {series.map((item, seriesIndex) => (
                  <span
                    key={item.label}
                    aria-hidden
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                    style={{ left: `${x(hover)}%`, top: `${y(data[hover].values[seriesIndex])}%`, background: item.color }}
                  />
                ))}
                <div
                  className={`pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card ${x(hover) > 55 ? "-translate-x-full" : ""}`}
                  style={{ left: `calc(${x(hover)}% + ${x(hover) > 55 ? -10 : 10}px)` }}
                >
                  <p className="mb-1 font-semibold text-ink">{data[hover].label}</p>
                  {series.map((item, seriesIndex) => (
                    <p key={item.label} className="flex items-center justify-between gap-3 text-ink-2">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden /> {item.label}</span>
                      <span className="font-medium text-ink">{money(data[hover].values[seriesIndex])}</span>
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink-3" aria-hidden>
            {data.map((point, index) => (index % labelEvery === 0 || index === data.length - 1 ? <span key={index}>{point.label}</span> : null))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ranked horizontal bars in one hue: the value is written on every row, so the bar only has to show proportion. */
export function BarList({
  items,
  color,
  format = "money",
  emptyText = "Hakuna data kwa kipindi hiki.",
}: {
  items: Array<{ label: string; value: number; note?: string }>;
  color: string;
  format?: "money" | "count";
  emptyText?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (items.length === 0 || items.every((item) => item.value === 0)) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-2">{item.label}{item.note ? <span className="ml-2 text-xs text-ink-3">{item.note}</span> : null}</span>
            <span className="shrink-0 font-semibold text-ink">{format === "money" ? money(item.value) : item.value.toLocaleString("en-TZ")}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-3">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One 100% bar split into parts, with a legend that carries the label, amount and share for each part. */
export function ShareBar({
  items,
  colors,
  format = "money",
  emptyText = "Hakuna data kwa kipindi hiki.",
}: {
  items: Array<{ label: string; value: number }>;
  colors: string[];
  format?: "money" | "count";
  emptyText?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
  const show = (value: number) => (format === "money" ? money(value) : value.toLocaleString("en-TZ"));
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={items.map((item) => `${item.label} ${Math.round((item.value / total) * 100)}%`).join(", ")}>
        {items.map((item, index) => (item.value > 0 ? (
          <span key={item.label} title={`${item.label}: ${show(item.value)}`} style={{ width: `${(item.value / total) * 100}%`, background: colors[index % colors.length] }} />
        ) : null))}
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink-2"><span className="size-2.5 rounded-sm" style={{ background: colors[index % colors.length] }} aria-hidden /> {item.label}</span>
            <span className="text-ink"><span className="font-semibold">{show(item.value)}</span> <span className="text-xs text-ink-3">· {Math.round((item.value / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
