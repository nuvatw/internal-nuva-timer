import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TodoItem from "./TodoItem";
import TodoInput from "./TodoInput";
import type { Todo } from "../../types/models";

interface TodoListProps {
  todos: Todo[];
  completedTodos: Todo[];
  activeSessionTodoId?: string | null;
  onAdd: (title: string, dueDate?: string | null, urgency?: number) => Promise<void>;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Todo, "title" | "due_date" | "urgency">>) => void;
  onSelect: (todo: Todo) => void;
  onReorder: (orderedIds: string[]) => void;
  onClearCompleted: () => void;
}

function SortableTodoItem({ todo, ...props }: { todo: Todo } & Omit<React.ComponentProps<typeof TodoItem>, "dragHandleProps">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TodoItem
        todo={todo}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
}

export default function TodoList({
  todos,
  completedTodos,
  activeSessionTodoId,
  onAdd,
  onComplete,
  onDelete,
  onUpdate,
  onSelect,
  onReorder,
  onClearCompleted,
}: TodoListProps) {
  // Sort: urgency descending (★★★ first), then by position
  const sorted = [...todos].sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency;
    return a.position - b.position;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(reordered.map((t) => t.id));
  };

  return (
    <div className="space-y-2">
      {sorted.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-3">
          No todos yet. Add one below!
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {sorted.map((todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                onComplete={onComplete}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onSelect={onSelect}
                isActive={todo.linked_session_id != null && todo.linked_session_id === activeSessionTodoId}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {/* Add input */}
      <TodoInput onAdd={onAdd} />

      {/* Completed section */}
      {completedTodos.length > 0 && (
        <CompletedSection
          todos={completedTodos}
          onClear={onClearCompleted}
        />
      )}
    </div>
  );
}

function CompletedSection({ todos, onClear }: { todos: Todo[]; onClear: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {expanded ? "▼" : "▶"} {todos.length} Completed
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-text-tertiary hover:text-destructive transition-colors"
        >
          Clear
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-text-tertiary line-through"
            >
              <span className="h-5 w-5 rounded-full border-2 border-success bg-success-muted flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-success">
                  <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="truncate">{todo.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
