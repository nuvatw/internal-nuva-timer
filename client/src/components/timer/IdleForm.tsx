import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, Timer } from "lucide-react";
import { api } from "../../lib/api";
import { tapScaleSmall } from "../../lib/motion";
import type { Department, Project } from "../../types/models";
import type { StartParams } from "../../types/timer";

interface IdleFormProps {
  onStart: (p: StartParams) => Promise<void>;
  onSchedule: (p: StartParams, delayMinutes: number) => void;
}

export default function IdleForm({ onStart, onSchedule }: IdleFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [duration, setDuration] = useState(20);
  const [plannedTitle, setPlannedTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDelay, setScheduleDelay] = useState(5);
  const [customDelay, setCustomDelay] = useState("");

  useEffect(() => {
    const lastDeptId = localStorage.getItem("nuva-last-department");
    const lastProjId = localStorage.getItem("nuva-last-project");

    api.get<Department[]>("/departments").then((data) => {
      setDepartments(data);
      if (data.length > 0 && !departmentId) {
        const saved = lastDeptId && data.find((d) => d.id === lastDeptId);
        if (saved) {
          setDepartmentId(saved.id);
        } else {
          const fallback = data.find((d) => d.name === "課程");
          setDepartmentId(fallback ? fallback.id : data[0].id);
        }
      }
    });
    api.get<Project[]>("/projects").then((data) => {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        const saved = lastProjId && data.find((p) => p.id === lastProjId);
        if (saved) {
          setProjectId(saved.id);
        } else {
          const fallback = data.find((p) => p.code === "P000");
          setProjectId(fallback ? fallback.id : data[0].id);
        }
      }
    });
    // Mount-only: fetch reference data once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildParams = (): StartParams | null => {
    if (!departmentId || !projectId || !plannedTitle.trim()) return null;
    const dept = departments.find((d) => d.id === departmentId)!;
    const proj = projects.find((p) => p.id === projectId)!;
    localStorage.setItem("nuva-last-department", departmentId);
    localStorage.setItem("nuva-last-project", projectId);
    return {
      departmentId,
      departmentName: dept.name,
      projectId,
      projectCode: proj.code,
      projectName: proj.name,
      durationMinutes: duration,
      plannedTitle: plannedTitle.trim(),
    };
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = buildParams();
    if (!params) return;

    setStarting(true);
    setError("");

    try {
      await onStart(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStarting(false);
    }
  };

  const handleSchedule = () => {
    const params = buildParams();
    if (!params) return;
    const delay = customDelay ? Math.min(99, Math.max(1, Number(customDelay))) : scheduleDelay;
    if (!delay || isNaN(delay)) return;
    onSchedule(params, delay);
  };

  return (
    <div className="flex items-center justify-center p-4 lg:p-8 pb-16">
      <motion.form
        onSubmit={handleStart}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
            <Clock size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-serif font-semibold text-text-primary">New Session</h2>
            <p className="text-xs text-text-tertiary">Set up your focus block</p>
          </div>
        </div>

        {/* Department + Project row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="department" className="block label-caps mb-1.5">
              Department
            </label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input w-full px-3 py-2.5"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="project" className="block label-caps mb-1.5">
              Project
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input w-full px-3 py-2.5"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block label-caps mb-2">
            Duration
          </label>
          {/* Quick-pick buttons */}
          <div className="flex gap-3 mb-4">
            {[10, 20, 40, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDuration(mins)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  duration === mins
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-bg text-text-secondary hover:bg-surface"
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>5 min</span>
              <span className="text-sm font-medium text-text-primary">{duration} min</span>
              <span>60 min</span>
            </div>
          </div>
        </div>

        {/* Planned Goal */}
        <div>
          <label htmlFor="planned-title" className="block label-caps mb-1.5">
            Goal
          </label>
          <input
            id="planned-title"
            type="text"
            required
            value={plannedTitle}
            onChange={(e) => setPlannedTitle(e.target.value)}
            placeholder="What will you focus on?"
            maxLength={200}
            className="input w-full px-3 py-3"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <motion.button
          type="submit"
          disabled={starting || !departmentId || !projectId || !plannedTitle.trim()}
          className="btn-primary inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 font-serif font-semibold"
          whileTap={tapScaleSmall}
        >
          <Play size={16} strokeWidth={2.5} />
          {starting ? "Starting..." : "Start Focus"}
        </motion.button>

        {/* Schedule toggle */}
        <button
          type="button"
          onClick={() => setShowSchedule((v) => !v)}
          className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors py-1"
        >
          <span className="inline-flex items-center gap-1">
            <Timer size={12} strokeWidth={2} />
            {showSchedule ? "Hide scheduled start" : "Schedule start"}
          </span>
        </button>

        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <p className="text-xs font-medium text-text-secondary">Start after</p>
                <div className="flex gap-2">
                  {[5, 10].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => { setScheduleDelay(mins); setCustomDelay(""); }}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        scheduleDelay === mins && !customDelay
                          ? "border-accent bg-accent-muted text-accent"
                          : "border-border bg-bg text-text-secondary hover:bg-surface"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={customDelay}
                      onChange={(e) => setCustomDelay(e.target.value)}
                      placeholder="Custom"
                      className={`input w-full px-3 py-2 text-sm text-center ${
                        customDelay ? "border-accent bg-accent-muted text-accent" : ""
                      }`}
                    />
                    {customDelay && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">
                        min
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!departmentId || !projectId || !plannedTitle.trim()}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-accent bg-accent-muted px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent hover:text-text-inverted disabled:opacity-50 transition-colors"
                  whileTap={tapScaleSmall}
                >
                  <Timer size={14} strokeWidth={2.5} />
                  Schedule in {customDelay || scheduleDelay} min
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
    </div>
  );
}
