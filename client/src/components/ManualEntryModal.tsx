import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { api } from "../lib/api";
import { todayYMD } from "../lib/dates";
import { useProgress, type GamificationResult } from "../contexts/ProgressContext";
import { toast } from "../contexts/ToastContext";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import type { Department, Project } from "../types/models";

interface ManualEntryModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function ManualEntryModal({ onClose, onSaved }: ManualEntryModalProps) {
  const { applyGamification, refresh: refreshProgress } = useProgress();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(todayYMD);
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

    // Build ISO timestamps using Asia/Taipei offset
    const startedAt = new Date(`${date}T${startTime}:00+08:00`);
    let endedAt = new Date(`${date}T${endTime}:00+08:00`);

    // Handle cross-midnight (end before start means next day)
    if (endedAt <= startedAt) {
      endedAt = new Date(`${date}T${endTime}:00+08:00`);
      endedAt.setDate(endedAt.getDate() + 1);
    }

    setSaving(true);
    try {
      const result = await api.post<{ gamification?: GamificationResult }>("/sessions/manual", {
        department_id: departmentId,
        project_id: projectId,
        planned_title: plannedTitle.trim(),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        completed,
        actual_title: !completed ? actualTitle.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      if (result.gamification) {
        applyGamification(result.gamification);
      }
      await refreshProgress();
      toast.success("Past session added");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Add Past Session"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <AnimatePresence>
          {!completed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

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
