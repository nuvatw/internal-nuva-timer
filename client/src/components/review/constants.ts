// ─── Chart Colors & Labels ──────────────────

export const DEPT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#f97316", // orange
  "#14b8a6", // teal
];

export const STATUS_COLORS: Record<string, string> = {
  completed_yes: "#22c55e",
  completed_no: "#f59e0b",
  canceled: "#a3a3a3",
};

export const STATUS_LABELS: Record<string, string> = {
  completed_yes: "Completed",
  completed_no: "Changed",
  canceled: "Canceled",
};

export const HOUR_LABELS = [
  "12a", "1a", "2a", "3a", "4a", "5a",
  "6a", "7a", "8a", "9a", "10a", "11a",
  "12p", "1p", "2p", "3p", "4p", "5p",
  "6p", "7p", "8p", "9p", "10p", "11p",
];

export function statusLabel(status: string) {
  switch (status) {
    case "completed_yes":
      return { text: "Completed", cls: "text-success bg-success-muted" };
    case "completed_no":
      return { text: "Changed", cls: "text-warning bg-warning-muted" };
    case "canceled":
      return { text: "Canceled", cls: "text-text-tertiary bg-surface-raised" };
    default:
      return { text: status, cls: "text-text-tertiary bg-surface-raised" };
  }
}
