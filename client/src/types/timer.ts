// ─── Timer Types ────────────────────────────
// Types for the useTimer hook and timer-related components.

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  sessionId: string;
  departmentId: string;
  departmentName: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  durationMinutes: number;
  startedAt: string; // ISO
  pausedAt: string | null; // ISO
  pausedTotalSeconds: number;
  status: TimerStatus;
}

export interface SessionResponse {
  id: string;
  status: string;
  started_at: string;
  paused_at: string | null;
  paused_total_seconds: number;
  duration_minutes: number;
  department_id: string;
  project_id: string;
  planned_title: string;
}

export interface ActiveSessionResponse {
  id: string;
  status: string;
  started_at: string;
  paused_at: string | null;
  paused_total_seconds: number;
  duration_minutes: number;
  department_id: string;
  project_id: string;
  planned_title: string;
  departments: { name: string };
  projects: { code: string | null; name: string };
}

export interface StartParams {
  departmentId: string;
  departmentName: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  durationMinutes: number;
  plannedTitle: string;
  todoId?: string;
}
