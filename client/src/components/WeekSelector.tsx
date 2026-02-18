import { getCurrentWeekNumber, getWeekRange, formatShortDate } from "../lib/dates";

interface WeekSelectorProps {
  /** Currently selected start week number */
  weekFrom: number;
  /** Currently selected end week number (same as weekFrom for single week) */
  weekTo: number;
  /** Called when week selection changes */
  onChange: (weekFrom: number, weekTo: number) => void;
}

function weekLabel(num: number): string {
  const range = getWeekRange(num);
  return `Week ${num} (${formatShortDate(range.start)} – ${formatShortDate(range.end)})`;
}

export default function WeekSelector({ weekFrom, weekTo, onChange }: WeekSelectorProps) {
  const currentWeek = getCurrentWeekNumber();
  const maxWeek = Math.max(currentWeek, 1);

  // Build week options (1 .. currentWeek)
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const isRange = weekFrom !== weekTo;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={weekFrom}
          onChange={(e) => {
            const val = Number(e.target.value);
            onChange(val, Math.max(val, weekTo));
          }}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          aria-label="Start week"
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {weekLabel(w)}
            </option>
          ))}
        </select>

        <span className="text-xs text-gray-400">to</span>

        <select
          value={weekTo}
          onChange={(e) => {
            const val = Number(e.target.value);
            onChange(Math.min(weekFrom, val), val);
          }}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          aria-label="End week"
        >
          {weeks
            .filter((w) => w >= weekFrom)
            .map((w) => (
              <option key={w} value={w}>
                {weekLabel(w)}
              </option>
            ))}
        </select>
      </div>

      {isRange && (
        <p className="text-xs text-gray-500 text-center">
          Week {weekFrom} – Week {weekTo}
        </p>
      )}
    </div>
  );
}
