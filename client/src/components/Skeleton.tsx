interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Loading skeleton that matches the ReviewPage summary + charts + session layout */
export function ReviewSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading" role="status">
      {/* Summary cards — responsive 2→4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      {/* Charts row — responsive stacked→side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Skeleton className="h-56 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
      {/* Session cards */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

/** Loading skeleton for calendar week view */
export function CalendarWeekSkeleton() {
  return (
    <div aria-label="Loading" role="status">
      {/* Day headers */}
      <div className="flex border-b border-border">
        <div className="w-12 shrink-0" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex-1 py-3 border-l border-border">
            <Skeleton className="h-3 w-8 mx-auto mb-1" />
            <Skeleton className="h-4 w-6 mx-auto" />
          </div>
        ))}
      </div>
      {/* Time grid */}
      <div className="flex" style={{ height: 400 }}>
        <div className="w-12 shrink-0 relative">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="absolute right-2 h-3 w-8" style={{ top: i * 50 }} />
          ))}
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex-1 border-l border-border-subtle relative p-1">
            {i % 2 === 0 && <Skeleton className="h-16 w-full mt-12" />}
            {i % 3 === 0 && <Skeleton className="h-10 w-full mt-36" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton for calendar month view */
export function CalendarMonthSkeleton() {
  return (
    <div aria-label="Loading" role="status">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border py-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-8 mx-auto" />
        ))}
      </div>
      {/* 6-row grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, i) => (
          <div key={i} className="min-h-[80px] border-b border-r border-border-subtle p-1.5">
            <Skeleton className="h-3 w-4 ml-auto mb-2" />
            {i % 3 === 0 && <Skeleton className="h-3 w-full mb-0.5" />}
            {i % 5 === 0 && <Skeleton className="h-3 w-3/4 mb-0.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton for settings sections */
export function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading" role="status">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  );
}
