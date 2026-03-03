import { memo, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Timer } from "lucide-react";
import { formatMinutes } from "../../lib/dates";
import { DEPT_COLORS } from "./constants";
import type { Summary } from "../../types/models";

const DepartmentBarChart = memo(function DepartmentBarChart({
  departments,
}: {
  departments: Summary["by_department"];
}) {
  const data = useMemo(
    () =>
      departments.map((d, i) => ({
        name: d.name,
        minutes: d.total_minutes,
        sessions: d.count,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
      })),
    [departments],
  );

  if (departments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg p-8 flex flex-col items-center justify-center text-center">
        <Timer size={20} strokeWidth={1.5} className="text-text-tertiary mb-2" />
        <p className="text-sm text-text-tertiary">No department data for this period</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">By Department</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMinutes(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-raised)", opacity: 0.5 }}
              contentStyle={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))",
              }}
              formatter={(value: number | undefined) => [formatMinutes(value ?? 0), "Time"]}
            />
            <Bar dataKey="minutes" radius={[0, 4, 4, 0]} animationDuration={1200} animationEasing="ease-in">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default DepartmentBarChart;
