import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, Calendar } from "lucide-react";

interface TodoInputProps {
  onAdd: (title: string, dueDate?: string | null, urgency?: number) => Promise<void>;
  placeholder?: string;
}

export default function TodoInput({ onAdd, placeholder = "Add a todo..." }: TodoInputProps) {
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [urgency, setUrgency] = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed, dueDate || null, urgency);
      setValue("");
      setDueDate("");
      setUrgency(1);
      setShowOptions(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Plus size={14} strokeWidth={2} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setShowOptions(true)}
            placeholder={placeholder}
            maxLength={200}
            disabled={submitting}
            className="input w-full pl-8 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <AnimatePresence>
        {showOptions && value.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-1">
              {/* Due date */}
              <label className="flex items-center gap-1.5 text-xs text-text-tertiary cursor-pointer">
                <Calendar size={12} />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input px-2 py-1 text-xs w-[130px]"
                />
              </label>

              {/* Urgency stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className="p-0.5 transition-colors"
                    title={`Urgency ${level}`}
                  >
                    <Star
                      size={14}
                      strokeWidth={2}
                      className={level <= urgency ? "text-amber-400 fill-amber-400" : "text-border hover:text-amber-300"}
                    />
                  </button>
                ))}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !value.trim()}
                className="ml-auto text-xs font-medium text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
