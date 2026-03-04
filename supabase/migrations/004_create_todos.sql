-- =============================================
-- nuva Focus Timer — Migration 004
-- Create todos table for department task management
-- =============================================

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  urgency INT NOT NULL DEFAULT 1 CHECK (urgency BETWEEN 1 AND 3),
  position INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  linked_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_dept ON todos(user_id, department_id);
CREATE INDEX idx_todos_active ON todos(user_id, is_completed, position);

-- RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY todos_all ON todos
  FOR ALL USING (user_id = (SELECT auth.uid()));
