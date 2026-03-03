import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { getDeptConfig, getDeptTargetMinutes } from "../lib/constants";
import { dashboardStaggerVariants, dashboardItemVariants } from "../lib/motion";
import { formatMinutes } from "../lib/dates";
import type { Summary } from "../types/models";

const DEPT_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DepartmentDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayStr();
    api
      .get<Summary>(`/reports/summary?start=${today}&end=${today}`)
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Loading skeleton ──────────────────────
  if (loading) {
    return (
      <div className="px-4 lg:px-8 pb-2">
        <div className="max-w-md mx-auto space-y-3">
          <div className="h-3 w-32 rounded skeleton" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-16 rounded skeleton" />
                <div className="h-3 w-20 rounded skeleton" />
              </div>
              <div className="h-3 w-full rounded-full skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.by_department.length === 0) return null;

  return (
    <div className="px-4 lg:px-8 pb-4">
      <motion.div
        className="max-w-md mx-auto space-y-3"
        variants={dashboardStaggerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.p
          className="label-caps"
          variants={dashboardItemVariants}
        >
          Today by Department
        </motion.p>

        {summary.by_department.map((dept, i) => {
          const cfg = getDeptConfig(dept.name);
          const target = getDeptTargetMinutes(dept.name);
          const pct = Math.min(100, Math.round((dept.total_minutes / target) * 100));
          const color = DEPT_COLORS[i % DEPT_COLORS.length];

          return (
            <motion.div key={dept.department_id} variants={dashboardItemVariants}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-semibold text-text-secondary">
                  {cfg.label}
                </span>
                <span className="text-xs text-text-tertiary">
                  {formatMinutes(dept.total_minutes)} / {formatMinutes(target)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-raised overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.3 + i * 0.15,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
