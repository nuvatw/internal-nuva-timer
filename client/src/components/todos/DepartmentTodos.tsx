import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListTodo } from "lucide-react";
import { api } from "../../lib/api";
import { getDeptConfig } from "../../lib/constants";
import { useTodos } from "../../contexts/TodoContext";
import TodoList from "./TodoList";
import type { Department, Todo } from "../../types/models";

interface DepartmentTodosProps {
  /** ID of the session that's currently running, to highlight linked todo */
  activeSessionId?: string | null;
  onSelectTodo: (todo: Todo) => void;
}

export default function DepartmentTodos({ activeSessionId, onSelectTodo }: DepartmentTodosProps) {
  const { todos, completedTodos, loading, addTodo, updateTodo, completeTodo, deleteTodo, reorderTodos, clearCompleted } = useTodos();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string>("");
  const [deptLoading, setDeptLoading] = useState(true);

  useEffect(() => {
    api.get<Department[]>("/departments").then((data) => {
      setDepartments(data);
      if (data.length > 0) {
        // Default to first department
        setActiveDeptId(data[0].id);
      }
      setDeptLoading(false);
    });
  }, []);

  // Sort departments A-Z by label
  const sortedDepts = useMemo(() => {
    return [...departments].sort((a, b) => {
      const la = getDeptConfig(a.name).label;
      const lb = getDeptConfig(b.name).label;
      return la.localeCompare(lb);
    });
  }, [departments]);

  // Filter todos by active department
  const deptTodos = useMemo(
    () => todos.filter((t) => t.department_id === activeDeptId),
    [todos, activeDeptId],
  );
  const deptCompleted = useMemo(
    () => completedTodos.filter((t) => t.department_id === activeDeptId),
    [completedTodos, activeDeptId],
  );

  // Count todos per department for badge
  const countByDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of todos) {
      map[t.department_id] = (map[t.department_id] || 0) + 1;
    }
    return map;
  }, [todos]);

  if (deptLoading || loading) {
    return (
      <div className="px-4 lg:px-8 py-4">
        <div className="max-w-md mx-auto">
          <div className="h-4 w-16 rounded skeleton mb-3" />
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex-1 h-9 rounded-lg skeleton" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-10 rounded-lg skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (departments.length === 0) return null;

  return (
    <div className="px-4 lg:px-8 py-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <ListTodo size={14} className="text-text-tertiary" />
          <span className="label-caps">Todos</span>
        </div>

        {/* Department tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {sortedDepts.map((dept) => {
            const cfg = getDeptConfig(dept.name);
            const isActive = dept.id === activeDeptId;
            const count = countByDept[dept.id] || 0;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setActiveDeptId(dept.id)}
                className={`relative shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-bg text-text-secondary hover:bg-surface"
                }`}
              >
                {cfg.label}
                {count > 0 && (
                  <span className={`ml-1 text-[10px] ${isActive ? "text-accent/70" : "text-text-tertiary"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Todo list for active department */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDeptId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TodoList
              todos={deptTodos}
              completedTodos={deptCompleted}
              activeSessionTodoId={activeSessionId}
              onAdd={async (title, dueDate, urgency) => { await addTodo(activeDeptId, title, dueDate, urgency); }}
              onComplete={completeTodo}
              onDelete={deleteTodo}
              onUpdate={(id, updates) => updateTodo(id, updates)}
              onSelect={onSelectTodo}
              onReorder={(orderedIds) => reorderTodos(activeDeptId, orderedIds)}
              onClearCompleted={clearCompleted}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
