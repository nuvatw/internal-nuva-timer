import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star, Trash2, GripVertical, Play, Pencil, Calendar } from "lucide-react";
import type { Todo } from "../../types/models";

interface TodoItemProps {
  todo: Todo;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (todo: Todo) => void;
  onUpdate?: (id: string, updates: Partial<Pick<Todo, "title" | "due_date" | "urgency">>) => void;
  isActive?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function getDueDateStyle(dueDate: string | null): { className: string; label: string } | null {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const month = due.getMonth() + 1;
  const day = due.getDate();
  const label = `${month}/${day}`;

  if (diffDays < 0) return { className: "text-destructive line-through", label };
  if (diffDays === 0) return { className: "text-destructive font-semibold", label: "Today" };
  if (diffDays === 1) return { className: "text-amber-500 font-medium", label: "Tomorrow" };
  return { className: "text-text-tertiary", label };
}

function UrgencyStars({ urgency, interactive, onChange }: { urgency: number; interactive?: boolean; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex gap-px shrink-0">
      {Array.from({ length: 3 }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i + 1)}
          className={interactive ? "p-0 transition-colors" : "p-0 cursor-default"}
        >
          <Star
            size={10}
            strokeWidth={2}
            className={i < urgency ? "text-amber-400 fill-amber-400" : "text-border"}
          />
        </button>
      ))}
    </span>
  );
}

export default function TodoItem({ todo, onComplete, onDelete, onSelect, onUpdate, isActive, dragHandleProps }: TodoItemProps) {
  const [hovering, setHovering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDate, setEditDate] = useState(todo.due_date || "");
  const [editUrgency, setEditUrgency] = useState(todo.urgency);
  const editInputRef = useRef<HTMLInputElement>(null);

  const dateStyle = getDueDateStyle(todo.due_date);
  const isDueToday = dateStyle?.label === "Today";
  const isOverdue = dateStyle?.className.includes("line-through") ?? false;

  useEffect(() => {
    if (editing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (!trimmed || !onUpdate) {
      setEditing(false);
      return;
    }
    const updates: Partial<Pick<Todo, "title" | "due_date" | "urgency">> = {};
    if (trimmed !== todo.title) updates.title = trimmed;
    if (editDate !== (todo.due_date || "")) updates.due_date = editDate || null;
    if (editUrgency !== todo.urgency) updates.urgency = editUrgency;

    if (Object.keys(updates).length > 0) {
      onUpdate(todo.id, updates);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <motion.div
        layout
        className="rounded-lg border border-accent bg-surface px-2.5 py-2 space-y-2"
      >
        <input
          ref={editInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          maxLength={200}
          className="input w-full px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Calendar size={12} />
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="input px-2 py-1 text-xs w-[130px]"
            />
          </label>
          <UrgencyStars urgency={editUrgency} interactive onChange={setEditUrgency} />
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="text-xs font-medium text-accent hover:text-accent/80"
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
        isActive
          ? "border-accent bg-accent-muted"
          : "border-border bg-bg hover:bg-surface"
      }`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Drag handle */}
      <span
        className="shrink-0 cursor-grab text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        {...dragHandleProps}
      >
        <GripVertical size={14} />
      </span>

      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onComplete(todo.id)}
        className="shrink-0 h-5 w-5 rounded-full border-2 border-border hover:border-accent flex items-center justify-center transition-colors"
        aria-label="Complete todo"
      >
        {hovering && <Check size={10} className="text-text-tertiary" />}
      </button>

      {/* Urgency stars */}
      <UrgencyStars urgency={todo.urgency} />

      {/* Title */}
      <button
        type="button"
        className={`flex-1 text-left text-sm truncate transition-colors ${
          isDueToday || isOverdue ? "text-destructive" : "text-text-primary"
        }`}
        onClick={() => onSelect(todo)}
        title="Click to start a focus session with this todo"
      >
        {todo.title}
      </button>

      {/* Due date */}
      {dateStyle && (
        <span className={`shrink-0 text-[11px] ${dateStyle.className}`}>
          {dateStyle.label}
        </span>
      )}

      {/* In-progress badge */}
      {isActive && (
        <span className="shrink-0 text-[10px] font-medium text-accent bg-accent-muted rounded px-1.5 py-0.5 animate-pulse">
          In progress
        </span>
      )}

      {/* Action icons on hover */}
      {!isActive && hovering && (
        <>
          <button
            type="button"
            onClick={() => {
              setEditTitle(todo.title);
              setEditDate(todo.due_date || "");
              setEditUrgency(todo.urgency);
              setEditing(true);
            }}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Edit todo"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={() => onSelect(todo)}
            className="shrink-0 text-accent hover:text-accent/80 transition-colors"
            aria-label="Start session with this todo"
          >
            <Play size={12} fill="currentColor" />
          </button>
        </>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        className="shrink-0 text-text-tertiary hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Delete todo"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}
