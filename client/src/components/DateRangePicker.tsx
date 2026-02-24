import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toYMD } from "../lib/dates";
import { useFocusTrap } from "../hooks/useFocusTrap";

// ─── Types ──────────────────────────────────

interface DateRangePickerProps {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  onApply: (start: string, end: string) => void;
}

interface CalendarDay {
  date: Date;
  ymd: string;
  day: number;
  isOutside: boolean;
}

// ─── Helpers ────────────────────────────────

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function dateFromYMD(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+08:00`);
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();

  // Monday = 0 offset
  const startOffset = (first.getDay() + 6) % 7;

  const days: CalendarDay[] = [];

  // Leading days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, ymd: toYMD(d), day: d.getDate(), isOutside: true });
  }

  // Current month
  for (let i = 1; i <= lastDate; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, ymd: toYMD(d), day: i, isOutside: false });
  }

  // Trailing days to fill last row
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, ymd: toYMD(d), day: i, isOutside: true });
    }
  }

  return days;
}

// ─── Component ──────────────────────────────

export default function DateRangePicker({ start, end, onApply }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => dateFromYMD(start).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => dateFromYMD(start).getMonth());
  const [rangeStart, setRangeStart] = useState<string | null>(start);
  const [rangeEnd, setRangeEnd] = useState<string | null>(end);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayYmd = useMemo(() => toYMD(new Date()), []);
  const monthLabel = MONTH_FMT.format(new Date(viewYear, viewMonth, 1));

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDayClick = useCallback((ymd: string) => {
    setRangeStart((prevStart) => {
      // If no start or both are set → start new selection
      if (!prevStart || (prevStart && rangeEnd !== null)) {
        setRangeEnd(null);
        return ymd;
      }
      // Second click → set end (ensure start <= end)
      if (ymd < prevStart) {
        setRangeEnd(prevStart);
        return ymd;
      }
      setRangeEnd(ymd);
      return prevStart;
    });
    // rangeStart is accessed via functional update, so only rangeEnd is needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeEnd]);

  const handleApply = () => {
    if (rangeStart && rangeEnd) {
      onApply(rangeStart, rangeEnd);
      setOpen(false);
    }
  };

  const handleOpen = () => {
    if (!open) {
      // Reset to current selection when opening
      setRangeStart(start);
      setRangeEnd(end);
      const d = dateFromYMD(start);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
      >
        Pick dates…
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Pick date range"
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            className="absolute left-0 top-full mt-2 z-50 rounded-2xl border border-border bg-bg shadow-xl p-5 w-[300px]"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="text-sm font-medium text-text-primary">{monthLabel}</span>
              <button
                onClick={nextMonth}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="h-8 flex items-center justify-center text-xs font-medium text-text-tertiary"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {days.map(({ ymd, day, isOutside }, i) => {
                const isStart = rangeStart !== null && isSameDay(ymd, rangeStart);
                const isEnd = rangeEnd !== null && isSameDay(ymd, rangeEnd);
                const isBothSame = isStart && isEnd;
                const inRange =
                  rangeStart !== null &&
                  rangeEnd !== null &&
                  ymd > rangeStart &&
                  ymd < rangeEnd;
                const isToday = isSameDay(ymd, todayYmd);

                // Column position for rounding range edges on row boundaries
                const col = i % 7;
                const isRowStart = col === 0;
                const isRowEnd = col === 6;

                // Range background classes
                let rangeBg = "";
                if (inRange) {
                  rangeBg = `bg-accent-muted ${isRowStart ? "rounded-l-full" : ""} ${isRowEnd ? "rounded-r-full" : ""}`;
                }

                return (
                  <div key={i} className="relative h-10 flex items-center justify-center">
                    {/* Range background — middle */}
                    {inRange && (
                      <div className={`absolute inset-y-1 inset-x-0 ${rangeBg}`} />
                    )}
                    {/* Range background — start side (right half) */}
                    {isStart && rangeEnd && !isBothSame && (
                      <div className={`absolute inset-y-1 left-1/2 right-0 bg-accent-muted ${isRowEnd ? "rounded-r-full" : ""}`} />
                    )}
                    {/* Range background — end side (left half) */}
                    {isEnd && rangeStart && !isBothSame && (
                      <div className={`absolute inset-y-1 left-0 right-1/2 bg-accent-muted ${isRowStart ? "rounded-l-full" : ""}`} />
                    )}

                    {/* Day button */}
                    <button
                      type="button"
                      onClick={() => handleDayClick(ymd)}
                      className={[
                        "relative z-10 h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors",
                        isStart || isEnd
                          ? "bg-accent text-text-inverted font-semibold"
                          : "",
                        inRange && !isStart && !isEnd
                          ? "text-accent font-medium"
                          : "",
                        isOutside && !isStart && !isEnd && !inRange
                          ? "text-text-tertiary/30"
                          : "",
                        !isStart && !isEnd && !inRange && !isOutside
                          ? "text-text-primary hover:bg-surface-raised"
                          : "",
                        isToday && !isStart && !isEnd
                          ? "font-bold text-accent"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-raised transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!rangeStart || !rangeEnd}
                className="btn-primary px-4 py-2 text-xs disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
