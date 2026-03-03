// ─── Department Configuration ─────────────────
// Shared between IdleForm and DepartmentDashboard.

export const DEPT_CONFIG: Record<string, { label: string; dailyHours: number }> = {
  "課程": { label: "COU", dailyHours: 2 },
  "行銷": { label: "MKT", dailyHours: 1 },
  "營運": { label: "OPS", dailyHours: 1 },
  "開發": { label: "R&D", dailyHours: 1 },
  "社群": { label: "SOC", dailyHours: 1 },
};

export function getDeptConfig(name: string) {
  return DEPT_CONFIG[name] ?? { label: name, dailyHours: 1 };
}

export function getDeptTargetMinutes(name: string): number {
  return getDeptConfig(name).dailyHours * 60;
}
