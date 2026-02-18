import { useEffect, useRef, useState } from "react";

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

  // Trap focus within the modal
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
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg space-y-5"
      >
        <h3 id="completion-title" className="text-lg font-semibold text-gray-900">
          Session Complete
        </h3>

        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Planned</p>
          <p className="text-sm text-gray-800 font-medium">
            &ldquo;{plannedTitle}&rdquo;
          </p>
        </div>

        {/* Yes / No radio */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            Did you complete the goal?
          </legend>
          <div className="flex gap-4">
            {([true, false] as const).map((val) => (
              <label
                key={String(val)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                  completed === val
                    ? val
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
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
                {val ? "Yes" : "No"}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actual title (required when No) */}
        {!completed && (
          <div>
            <label
              htmlFor="actual-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              What I actually did <span className="text-red-500">*</span>
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
          </div>
        )}

        {/* Notes (always optional) */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Session"}
        </button>
      </form>
    </div>
  );
}
