import { memo, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatMinutes } from "../../lib/dates";
import { DEPT_COLORS } from "./constants";
import ChartTooltip from "./ChartTooltip";
import type { Session } from "../../types/models";

const ProjectBarChart = memo(function ProjectBarChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => {
    const projectMap = new Map<string, { name: string; minutes: number; count: number }>();
    for (const s of sessions) {
      const key = s.project_id;
      const label = s.projects.code
        ? `${s.projects.code} ${s.projects.name}`
        : s.projects.name;
      const existing = projectMap.get(key) || { name: label, minutes: 0, count: 0 };
      existing.minutes += s.duration_minutes;
      existing.count++;
      projectMap.set(key, existing);
    }
    return Array.from(projectMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6)
      .map((d, i) => ({
        ...d,
        fill: DEPT_COLORS[(i + 2) % DEPT_COLORS.length],
      }));
  }, [sessions]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">By Project</h3>
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
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, name) =>
                    name === "minutes" ? formatMinutes(v) : `${v} sessions`
                  }
                />
              }
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

export default ProjectBarChart;
