import { cn } from "@/lib/cn";

export function ProgressBar({
  pct,
  labelLeft,
  labelRight,
  animate = true,
  className,
}: {
  pct: number;
  labelLeft?: string;
  labelRight?: string;
  animate?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("w-full", className)}>
      {(labelLeft || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="text-ink-2">{labelLeft}</span>
          {labelRight ? <span className="font-semibold text-ink">{labelRight}</span> : null}
        </div>
      )}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("relative h-full overflow-hidden rounded-full", animate && "progress-grow")}
          style={{
            width: `${clamped}%`,
            background: "linear-gradient(90deg, var(--primary), var(--primary-2), var(--success))",
          }}
        >
          {animate && (
            <span
              aria-hidden
              className="progress-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            />
          )}
        </div>
      </div>
    </div>
  );
}