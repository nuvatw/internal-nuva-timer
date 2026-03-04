import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "./ToastContext";
import type { Todo } from "../types/models";

// ─── Types ──────────────────────────────────

interface TodoContextValue {
  todos: Todo[];
  completedTodos: Todo[];
  loading: boolean;
  addTodo: (departmentId: string, title: string, dueDate?: string | null, urgency?: number) => Promise<Todo>;
  updateTodo: (id: string, updates: Partial<Pick<Todo, "title" | "due_date" | "urgency" | "is_completed">>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  completeTodo: (id: string) => Promise<void>;
  reorderTodos: (departmentId: string, orderedIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  refresh: () => Promise<void>;
  selectedTodo: Todo | null;
  selectTodo: (todo: Todo | null) => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

// ─── Provider ───────────────────────────────

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const [active, completed] = await Promise.all([
        api.get<Todo[]>("/todos"),
        api.get<Todo[]>("/todos?include_completed=true"),
      ]);
      setTodos(active);
      setCompletedTodos(completed.filter((t) => t.is_completed));
    } catch {
      // Silently fail on fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Refetch on tab focus
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        fetchTodos();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchTodos]);

  const addTodo = useCallback(async (departmentId: string, title: string, dueDate?: string | null, urgency?: number) => {
    try {
      const newTodo = await api.post<Todo>("/todos", {
        department_id: departmentId,
        title,
        due_date: dueDate || null,
        urgency: urgency ?? 1,
      });
      setTodos((prev) => [...prev, newTodo]);
      return newTodo;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add todo");
      throw err;
    }
  }, []);

  const updateTodo = useCallback(async (id: string, updates: Partial<Pick<Todo, "title" | "due_date" | "urgency" | "is_completed">>) => {
    try {
      const updated = await api.patch<Todo>(`/todos/${id}`, updates);
      if (updated.is_completed) {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        setCompletedTodos((prev) => [...prev, updated]);
      } else {
        setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update todo");
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic removal
    const prevTodos = todos;
    const prevCompleted = completedTodos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setCompletedTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.delete(`/todos/${id}`);
    } catch (err) {
      // Rollback
      setTodos(prevTodos);
      setCompletedTodos(prevCompleted);
      toast.error(err instanceof Error ? err.message : "Failed to delete todo");
    }
  }, [todos, completedTodos]);

  const completeTodo = useCallback(async (id: string) => {
    // Optimistic: move to completed
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const optimistic = { ...todo, is_completed: true, completed_at: new Date().toISOString() };
    setCompletedTodos((prev) => [...prev, optimistic]);
    try {
      await api.post<Todo>(`/todos/${id}/complete`);
    } catch (err) {
      // Rollback
      setTodos((prev) => [...prev, todo]);
      setCompletedTodos((prev) => prev.filter((t) => t.id !== id));
      toast.error(err instanceof Error ? err.message : "Failed to complete todo");
    }
  }, [todos]);

  const reorderTodos = useCallback(async (departmentId: string, orderedIds: string[]) => {
    // Optimistic update with rollback
    const prevTodos = todos;
    setTodos((prev) => {
      const deptTodos = prev.filter((t) => t.department_id === departmentId);
      const otherTodos = prev.filter((t) => t.department_id !== departmentId);
      const reordered = orderedIds
        .map((id, idx) => {
          const todo = deptTodos.find((t) => t.id === id);
          return todo ? { ...todo, position: idx } : null;
        })
        .filter(Boolean) as Todo[];
      return [...otherTodos, ...reordered];
    });

    try {
      const items = orderedIds.map((id, idx) => ({ id, position: idx }));
      await api.post("/todos/reorder", { items });
    } catch (err) {
      setTodos(prevTodos);
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  }, [todos]);

  const clearCompleted = useCallback(async () => {
    const prev = completedTodos;
    setCompletedTodos([]);
    try {
      await api.delete("/todos/completed/clear");
    } catch (err) {
      setCompletedTodos(prev);
      toast.error(err instanceof Error ? err.message : "Failed to clear completed");
    }
  }, [completedTodos]);

  const selectTodo = useCallback((todo: Todo | null) => {
    setSelectedTodo(todo);
  }, []);

  const value = useMemo<TodoContextValue>(() => ({
    todos,
    completedTodos,
    loading,
    addTodo,
    updateTodo,
    deleteTodo,
    completeTodo,
    reorderTodos,
    clearCompleted,
    refresh: fetchTodos,
    selectedTodo,
    selectTodo,
  }), [todos, completedTodos, loading, addTodo, updateTodo, deleteTodo, completeTodo, reorderTodos, clearCompleted, fetchTodos, selectedTodo, selectTodo]);

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────

export function useTodos(): TodoContextValue {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
