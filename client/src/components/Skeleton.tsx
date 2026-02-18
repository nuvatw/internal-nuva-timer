interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Loading skeleton that matches the ReviewPage summary + session layout */
export function ReviewSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading" role="status">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      {/* Department chart */}
      <Skeleton className="h-28" />
      {/* Session cards */}
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
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
