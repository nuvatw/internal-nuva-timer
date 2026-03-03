import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

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
    <Modal
      onClose={() => {}}
      showClose={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <h3 className="text-lg font-serif font-semibold text-text-primary">
          Session Complete
        </h3>
        <div className="rounded-lg bg-surface px-3 py-2.5">
          <p className="text-xs text-text-tertiary">Planned</p>
          <p className="text-sm text-text-primary font-medium mt-0.5">
            {plannedTitle}
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
                className="input w-full px-3 py-2 resize-none"
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
            className="input w-full px-3 py-2 resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          disabled={saving}
          className="w-full font-semibold"
        >
          Save Session
        </Button>
      </form>
    </Modal>
  );
}
