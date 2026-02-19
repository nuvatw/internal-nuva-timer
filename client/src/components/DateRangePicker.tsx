import { useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { toYMD } from "../lib/dates";

interface DateRangePickerProps {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  onApply: (start: string, end: string) => void;
}

export default function DateRangePicker({ start, end, onApply }: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(`${start}T00:00:00+08:00`),
    to: new Date(`${end}T00:00:00+08:00`),
  });
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    if (range?.from && range?.to) {
      onApply(toYMD(range.from), toYMD(range.to));
      setOpen(false);
    }
  };

  const handleReset = () => {
    setRange(undefined);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface transition-colors"
      >
        Pick dates...
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Popover */}
          <div className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-border bg-bg shadow-lg p-4">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              pagedNavigation
              selected={range}
              onSelect={setRange}
              showOutsideDays
              classNames={{
                root: "text-sm",
                day: "rounded-lg",
                selected: "bg-accent text-text-inverted",
                range_start: "bg-accent text-text-inverted rounded-l-lg",
                range_end: "bg-accent text-text-inverted rounded-r-lg",
                range_middle: "bg-accent-muted text-accent",
                today: "font-bold text-accent",
              }}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
              <button
                onClick={handleReset}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                Reset
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!range?.from || !range?.to}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
