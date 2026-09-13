export function ProgressBar({
  pct,
  labelLeft,
  labelRight,
}: {
  pct: number;
  labelLeft?: string;
  labelRight?: string;
}) {
  return (
    <div>
      {(labelLeft || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between text-[13px]">
          <span className="text-ink-2">{labelLeft}</span>
          {labelRight ? <span className="font-medium text-ink">{labelRight}</span> : null}
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: "linear-gradient(90deg, var(--primary), var(--primary-2), var(--success))",
          }}
        />
      </div>
    </div>
  );
}