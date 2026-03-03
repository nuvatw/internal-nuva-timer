// ─── Chart Colors & Labels ──────────────────

export const DEPT_COLORS = [
  "#d97706", // amber-600
  "#b45309", // amber-700
  "#f59e0b", // amber-500
  "#92400e", // amber-800
  "#fbbf24", // amber-400
  "#ca8a04", // yellow-600
  "#a16207", // yellow-700
  "#eab308", // yellow-500
];

export const STATUS_COLORS: Record<string, string> = {
  completed_yes: "#d97706",
  completed_no: "#fbbf24",
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
