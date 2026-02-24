import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { api } from "../../lib/api";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useProgress, type GamificationResult } from "../../contexts/ProgressContext";
import { toast } from "../../contexts/ToastContext";
import type { Department, Project } from "../../types/models";

interface ManualEntryModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function ManualEntryModal({ onClose, onCreated }: ManualEntryModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const { applyGamification, refresh: refreshProgress } = useProgress();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [plannedTitle, setPlannedTitle] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [completed, setCompleted] = useState(true);
  const [actualTitle, setActualTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Department[]>("/departments").then((data) => {
      setDepartments(data);
      if (data.length > 0) setDepartmentId(data[0].id);
    });
    api.get<Project[]>("/projects").then((data) => {
      setProjects(data);
      if (data.length > 0) setProjectId(data[0].id);
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !projectId || !plannedTitle.trim()) return;
    if (!completed && !actualTitle.trim()) {
      setError("Please describe what you actually did");
      return;
    }

    const started_at = `${date}T${startTime}:00+08:00`;
    const ended_at = `${date}T${endTime}:00+08:00`;

    // Validate end > start
    if (new Date(ended_at) <= new Date(started_at)) {
      setError("End time must be after start time");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await api.post<{ gamification?: GamificationResult }>("/sessions/manual", {
        department_id: departmentId,
        project_id: projectId,
        planned_title: plannedTitle.trim(),
        started_at,
        ended_at,
        completed,
        actual_title: !completed ? actualTitle.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      if (result.gamification) {
        applyGamification(result.gamification);
      }
      await refreshProgress();
      toast.success("Past session added");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add session");
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-bg p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Add Past Session</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-raised transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Department + Project */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="manual-dept" className="block label-caps mb-1">Department</label>
            <select
              id="manual-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full px-3 py-2"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manual-proj" className="block label-caps mb-1">Project</label>
            <select
              id="manual-proj"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input w-full px-3 py-2"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal */}
        <div>
          <label htmlFor="manual-title" className="block label-caps mb-1">Goal</label>
          <input
            id="manual-title"
            type="text"
            required
            value={plannedTitle}
            onChange={(e) => setPlannedTitle(e.target.value)}
            placeholder="What did you focus on?"
            maxLength={200}
            className="input w-full px-3 py-2"
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="manual-date" className="block label-caps mb-1">Date</label>
            <input
              id="manual-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="input w-full px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="manual-start" className="block label-caps mb-1">Start</label>
            <input
              id="manual-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input w-full px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="manual-end" className="block label-caps mb-1">End</label>
            <input
              id="manual-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input w-full px-3 py-2"
            />
          </div>
        </div>

        {/* Completed? */}
        <fieldset>
          <legend className="text-sm font-medium text-text-secondary mb-2">
            Did you complete the goal?
          </legend>
          <div className="flex gap-3">
            {([true, false] as const).map((val) => (
              <label
                key={String(val)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                  completed === val
                    ? val
                      ? "border-success bg-success-muted text-success"
                      : "border-destructive bg-destructive-muted text-destructive"
                    : "border-border bg-bg text-text-secondary hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="manual-completed"
                  checked={completed === val}
                  onChange={() => { setCompleted(val); setError(""); }}
                  className="sr-only"
                />
                {val ? <><Check size={14} strokeWidth={2} /> Yes</> : <><X size={14} strokeWidth={2} /> No</>}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actual title (when No) */}
        {!completed && (
          <div>
            <label htmlFor="manual-actual" className="block text-sm font-medium text-text-secondary mb-1">
              What I actually did <span className="text-destructive">*</span>
            </label>
            <input
              id="manual-actual"
              type="text"
              value={actualTitle}
              onChange={(e) => { setActualTitle(e.target.value); if (error) setError(""); }}
              placeholder="Describe what you worked on instead"
              maxLength={200}
              className="input w-full px-3 py-2"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="manual-notes" className="block text-sm font-medium text-text-secondary mb-1">
            Notes <span className="text-text-tertiary">(optional)</span>
          </label>
          <textarea
            id="manual-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="input w-full px-3 py-2 resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving || !departmentId || !projectId || !plannedTitle.trim()}
          className="btn-primary w-full px-4 py-3 font-semibold"
        >
          {saving ? "Saving..." : "Add Session"}
        </button>
      </motion.form>
    </motion.div>
  );
}
