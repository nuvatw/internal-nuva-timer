import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { api } from "../../lib/api";
import { todayYMD } from "../../lib/dates";
import { completionModalVariants, completionModalTransition } from "../../lib/motion";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { Department, Project } from "../../types/models";
import type { GamificationResult } from "../../contexts/ProgressContext";

interface ManualEntryModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function ManualEntryModal({ onClose, onSaved }: ManualEntryModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [plannedTitle, setPlannedTitle] = useState("");
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
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!departmentId || !projectId) {
      setError("Please select a department and project");
      return;
    }
    if (!plannedTitle.trim()) {
      setError("Goal is required");
      return;
    }
    if (!completed && !actualTitle.trim()) {
      setError("Please describe what you actually did");
      return;
    }

    // Build ISO timestamps using the Asia/Taipei offset
    const startedAt = new Date(`${date}T${startTime}:00+08:00`).toISOString();
    const endedAt = new Date(`${date}T${endTime}:00+08:00`).toISOString();

    // Handle cross-midnight (end before start means next day)
    let endDate = new Date(endedAt);
    const startDate = new Date(startedAt);
    if (endDate <= startDate) {
      const nextDay = new Date(`${date}T${endTime}:00+08:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      endDate = nextDay;
    }

    setSaving(true);
    try {
      await api.post<{ gamification?: GamificationResult }>("/sessions/manual", {
        department_id: departmentId,
        project_id: projectId,
        planned_title: plannedTitle.trim(),
        started_at: startDate.toISOString(),
        ended_at: endDate.toISOString(),
        completed,
        actual_title: !completed ? actualTitle.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-entry-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-bg p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto"
        variants={completionModalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={completionModalTransition}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="manual-entry-title" className="text-lg font-semibold text-text-primary">
            Add Session
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Department & Project */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps mb-1 block">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps mb-1 block">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="label-caps mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayYMD()}
            className="input w-full px-3 py-2 text-sm"
          />
        </div>

        {/* Start & End Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps mb-1 block">Start Time</label>
            <input
              type="time"
              lang="en-GB"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input w-full px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="label-caps mb-1 block">End Time</label>
            <input
              type="time"
              lang="en-GB"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input w-full px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="label-caps mb-1 block">
            Goal <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={plannedTitle}
            onChange={(e) => { setPlannedTitle(e.target.value); if (error) setError(""); }}
            placeholder="What did you focus on?"
            maxLength={200}
            className="input w-full px-3 py-2 text-sm"
          />
        </div>

        {/* Completed toggle */}
        <fieldset>
          <legend className="label-caps mb-2">Completed?</legend>
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
                  name="completed"
                  checked={completed === val}
                  onChange={() => setCompleted(val)}
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

        {/* Actual title (when not completed) */}
        {!completed && (
          <div>
            <label className="label-caps mb-1 block">
              What I actually did <span className="text-destructive">*</span>
            </label>
            <textarea
              value={actualTitle}
              onChange={(e) => { setActualTitle(e.target.value); if (error) setError(""); }}
              placeholder="Describe what you worked on instead"
              maxLength={200}
              rows={2}
              className="input w-full px-3 py-2 text-sm resize-none"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label-caps mb-1 block">
            Notes <span className="text-text-tertiary">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="input w-full px-3 py-2 text-sm resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full px-4 py-3 font-semibold"
        >
          {saving ? "Saving..." : "Save Session"}
        </button>
      </motion.form>
    </motion.div>
  );
}
