import { memo, useMemo } from "react";
import { TZ } from "../../lib/dates";
import { HOUR_LABELS } from "./constants";
import type { Session } from "../../types/models";

const TimeOfDayChart = memo(function TimeOfDayChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    for (const s of sessions) {
      const d = new Date(s.started_at);
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TZ,
          hour: "numeric",
          hour12: false,
        }).format(d)
      );
      hourCounts[hour]++;
    }
    return hourCounts.map((count, hour) => ({
      hour: HOUR_LABELS[hour],
      count,
    }));
  }, [sessions]);

  const maxCount = Math.max(...data.map((d) => d.count));
  if (maxCount === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Time of Day</h3>
      <div className="flex items-end gap-[3px] h-24">
        {data.map((d, i) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className="w-full rounded-sm transition-colors animate-bar-grow"
                style={{
                  height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                  backgroundColor: d.count > 0 ? "var(--color-accent)" : "var(--color-border)",
                  opacity: d.count > 0 ? 0.7 + (pct / 100) * 0.3 : 0.3,
                  animationDelay: `${i * 25}ms`,
                }}
              />
              {d.count > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] text-text-primary shadow whitespace-nowrap z-10">
                  {d.count} session{d.count !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex text-[9px] text-text-tertiary">
        <span className="flex-1 text-left">12am</span>
        <span className="flex-1 text-center">6am</span>
        <span className="flex-1 text-center">12pm</span>
        <span className="flex-1 text-center">6pm</span>
        <span className="flex-[0.3] text-right">12</span>
      </div>
    </div>
  );
});

export default TimeOfDayChart;
