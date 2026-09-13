export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`panel overflow-hidden ${className}`}>
      <div className="skeleton-glow h-1.5" />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="skeleton h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-2/3 rounded-md" />
            <div className="skeleton h-3 w-1/3 rounded-md" />
          </div>
        </div>
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-lg" />
          <div className="skeleton h-9 w-24 rounded-lg" />
          <div className="flex-1" />
          <div className="skeleton h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ title = "Pakia..." }: { title?: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-7 w-44 rounded-lg" />
          <div className="skeleton h-3.5 w-72 max-w-full rounded-md" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}