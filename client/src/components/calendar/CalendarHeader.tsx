import { memo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type CalendarView = "week" | "month";

interface CalendarHeaderProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  showToday?: boolean;
  onAddSession?: () => void;
}

export default memo(function CalendarHeader({
  view,
  onViewChange,
  title,
  onPrev,
  onNext,
  onToday,
  showToday = true,
  onAddSession,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="rounded-lg border border-border bg-bg p-1.5 text-text-secondary hover:bg-surface-raised transition-colors active:scale-[0.97]"
          aria-label={view === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onNext}
          className="rounded-lg border border-border bg-bg p-1.5 text-text-secondary hover:bg-surface-raised transition-colors active:scale-[0.97]"
          aria-label={view === "week" ? "Next week" : "Next month"}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>

        {showToday && (
          <button
            onClick={onToday}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors active:scale-[0.97]"
          >
            Today
          </button>
        )}

        <h2 className="text-base font-semibold text-text-primary ml-2">
          {title}
        </h2>
      </div>

      {/* Right: Add + View toggle */}
      <div className="flex items-center gap-2">
        {onAddSession && (
          <button
            onClick={onAddSession}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors active:scale-[0.97]"
          >
            <Plus size={14} strokeWidth={2} />
            Add
          </button>
        )}
      <div className="flex items-center gap-0.5 rounded-lg bg-surface-raised p-0.5">
        {(["week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === v
                ? "bg-bg text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {v === "week" ? "Week" : "Month"}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
});
