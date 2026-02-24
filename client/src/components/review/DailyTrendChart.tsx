import { memo, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toYMD, addDays, formatShortDate, formatMinutes } from "../../lib/dates";
import ChartTooltip from "./ChartTooltip";
import type { Session } from "../../types/models";

const DailyTrendChart = memo(function DailyTrendChart({
  sessions,
  dateStart,
  dateEnd,
}: {
  sessions: Session[];
  dateStart: string;
  dateEnd: string;
}) {
  const data = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const s of sessions) {
      const date = toYMD(new Date(s.started_at));
      dateMap.set(date, (dateMap.get(date) || 0) + s.duration_minutes);
    }

    const result: { date: string; label: string; minutes: number }[] = [];
    let current = dateStart;
    while (current <= dateEnd) {
      result.push({
        date: current,
        label: formatShortDate(current),
        minutes: dateMap.get(current) || 0,
      });
      current = addDays(current, 1);
    }
    return result;
  }, [sessions, dateStart, dateEnd]);

  if (data.length <= 1) return null;

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Daily Focus Trend</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => formatMinutes(v)}
            />
            <Tooltip
              content={
                <ChartTooltip formatter={(v) => formatMinutes(v)} />
              }
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="url(#focusGradient)"
              animationDuration={1200}
              animationEasing="ease-in"
              dot={data.length <= 14 ? { r: 3, fill: "var(--color-accent)", strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: "var(--color-accent)", strokeWidth: 2, stroke: "var(--color-bg)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default DailyTrendChart;
