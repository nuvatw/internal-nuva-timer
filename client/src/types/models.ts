// ─── Canonical Entity Types ─────────────────
// Single source of truth for DB entity shapes used across the client.

export interface Department {
  id: string;
  name: string;
  is_archived: boolean;
}

export interface Project {
  id: string;
  code: string | null;
  name: string;
  is_archived: boolean;
}

export interface Session {
  id: string;
  department_id: string;
  project_id: string;
  duration_minutes: number;
  status: string;
  planned_title: string;
  actual_title: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  canceled_at: string | null;
  elapsed_seconds: number | null;
  departments: { name: string };
  projects: { code: string | null; name: string };
}

export interface Summary {
  total_minutes: number;
  session_count: number;
  by_department: {
    department_id: string;
    name: string;
    total_minutes: number;
    count: number;
  }[];
}

export interface ProgressData {
  total_xp: number;
  current_level: number;
  level_title: string;
  xp_current_level: number;
  xp_next_level: number;
  daily_focus_minutes: number;
  daily_tomatoes: number;
  daily_xp: number;
  tomato_goal: number;
  current_streak: number;
  longest_streak: number;
  current_multiplier: number;
  sessions_completed: number;
  total_focus_minutes: number;
}

export interface Todo {
  id: string;
  department_id: string;
  title: string;
  due_date: string | null;
  urgency: number; // 1-3
  position: number;
  is_completed: boolean;
  completed_at: string | null;
  linked_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamificationResult {
  xp_gained: number;
  new_tomatoes: number;
  total_xp: number;
  current_level: number;
  level_title: string;
  level_changed: { from: number; to: number } | null;
}
