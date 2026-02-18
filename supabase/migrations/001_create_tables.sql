-- =============================================
-- nuva Focus Timer — Database Schema
-- Migration 001: Create all tables, indexes,
-- triggers, seed function, and RLS policies
-- =============================================

-- ===================
-- 1. TABLES
-- ===================

-- Profiles (auto-created by trigger on auth.users INSERT)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  duration_minutes INT NOT NULL CHECK (duration_minutes IN (30, 60)),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed_yes', 'completed_no', 'canceled')),
  planned_title TEXT NOT NULL,
  actual_title TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paused_total_seconds INT NOT NULL DEFAULT 0,
  canceled_at TIMESTAMPTZ,
  elapsed_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================
-- 2. INDEXES
-- ===================

CREATE INDEX idx_departments_user ON departments(user_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);
CREATE INDEX idx_sessions_status ON sessions(user_id, status);

-- ===================
-- 3. TRIGGER: Auto-create profile on signup
-- ===================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- 4. SEED FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION public.seed_user_defaults(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO departments (user_id, name) VALUES
    (p_user_id, '營運'),
    (p_user_id, '行銷'),
    (p_user_id, '課程'),
    (p_user_id, '社群'),
    (p_user_id, '開發');

  INSERT INTO projects (user_id, code, name) VALUES
    (p_user_id, 'p039', 'nuvaClub-funding');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- 5. ROW LEVEL SECURITY
-- ===================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Departments: users can CRUD only their own
CREATE POLICY departments_all ON departments
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Projects: users can CRUD only their own
CREATE POLICY projects_all ON projects
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Sessions: users can CRUD only their own
CREATE POLICY sessions_all ON sessions
  FOR ALL USING (user_id = (SELECT auth.uid()));
