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
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
          <div className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white shadow-lg p-4">
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
                selected: "bg-indigo-600 text-white",
                range_start: "bg-indigo-600 text-white rounded-l-lg",
                range_end: "bg-indigo-600 text-white rounded-r-lg",
                range_middle: "bg-indigo-50 text-indigo-900",
                today: "font-bold text-indigo-600",
              }}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Reset
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!range?.from || !range?.to}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
