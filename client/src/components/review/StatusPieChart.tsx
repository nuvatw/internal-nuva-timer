import { memo, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { STATUS_COLORS, STATUS_LABELS } from "./constants";
import type { Session } from "../../types/models";

const StatusPieChart = memo(function StatusPieChart({ sessions }: { sessions: Session[] }) {
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.status] = (counts[s.status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        fill: STATUS_COLORS[status] || "#a3a3a3",
      }))
      .sort((a, b) => b.value - a.value);
  }, [sessions]);

  if (breakdown.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Status Breakdown</h3>
      <div className="flex items-center gap-6">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                animationDuration={1200}
                animationEasing="ease-in"
                stroke="none"
              >
                {breakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          {breakdown.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-text-secondary flex-1 truncate">{item.name}</span>
              <span className="text-text-primary font-medium tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default StatusPieChart;
