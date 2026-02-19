import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { overlayVariants, modalVariants, modalTransition } from "../lib/motion";

interface CompletionModalProps {
  plannedTitle: string;
  onSave: (data: {
    completed: boolean;
    actualTitle?: string;
    notes?: string;
  }) => Promise<void>;
}

export default function CompletionModal({
  plannedTitle,
  onSave,
}: CompletionModalProps) {
  const [completed, setCompleted] = useState(true);
  const [actualTitle, setActualTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!completed && !actualTitle.trim()) {
      setError("Please describe what you actually did");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        completed,
        actualTitle: !completed ? actualTitle.trim() : undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={modalTransition}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-bg p-6 shadow-lg space-y-5"
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={modalTransition}
      >
        <h3 id="completion-title" className="text-lg font-semibold text-text-primary">
          Session Complete
        </h3>

        <div className="rounded-lg bg-surface px-3 py-2.5">
          <p className="text-xs text-text-tertiary">Planned</p>
          <p className="text-sm text-text-primary font-medium mt-0.5">
            &ldquo;{plannedTitle}&rdquo;
          </p>
        </div>

        {/* Yes / No radio */}
        <fieldset>
          <legend className="text-sm font-medium text-text-secondary mb-2">
            Did you complete the goal?
          </legend>
          <div className="flex gap-3">
            {([true, false] as const).map((val) => (
              <label
                key={String(val)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                  completed === val
                    ? val
                      ? "border-success bg-success-muted text-success"
                      : "border-destructive bg-destructive-muted text-destructive"
                    : "border-border bg-bg text-text-secondary hover:bg-surface"
                }`}
              >
                <input
                  ref={val === true ? firstInputRef : undefined}
                  type="radio"
                  name="completed"
                  checked={completed === val}
                  onChange={() => {
                    setCompleted(val);
                    setError("");
                  }}
                  className="sr-only"
                />
                {val ? (
                  <><Check size={14} strokeWidth={2} /> Yes</>
                ) : (
                  <><X size={14} strokeWidth={2} /> No</>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actual title (required when No) */}
        <AnimatePresence>
        {!completed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label
              htmlFor="actual-title"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              What I actually did <span className="text-destructive">*</span>
            </label>
            <textarea
              id="actual-title"
              value={actualTitle}
              onChange={(e) => {
                setActualTitle(e.target.value);
                if (error) setError("");
              }}
              placeholder="Describe what you worked on instead"
              maxLength={200}
              rows={2}
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none resize-none"
            />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Notes (always optional) */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Notes <span className="text-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Session"}
        </button>
      </motion.form>
    </motion.div>
  );
}
