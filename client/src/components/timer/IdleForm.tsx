import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, Timer } from "lucide-react";
import { api } from "../../lib/api";
import { getDeptConfig } from "../../lib/constants";
import { tapScaleSmall, idleFormStagger, idleFormItem } from "../../lib/motion";
import type { Department, Project } from "../../types/models";
import type { StartParams } from "../../types/timer";

interface IdleFormProps {
  onStart: (p: StartParams) => Promise<void>;
  onSchedule: (p: StartParams, delayMinutes: number) => void;
  prefill?: { departmentId: string; plannedTitle: string; todoId: string };
}

export default function IdleForm({ onStart, onSchedule, prefill }: IdleFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [duration, setDuration] = useState(20);
  const [plannedTitle, setPlannedTitle] = useState("");
  const [todoId, setTodoId] = useState<string | undefined>(undefined);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDelay, setScheduleDelay] = useState(5);
  const [customDelay, setCustomDelay] = useState("");

  useEffect(() => {
    const lastDeptId = localStorage.getItem("nuva-last-department");
    const lastProjId = localStorage.getItem("nuva-last-project");

    Promise.all([
      api.get<Department[]>("/departments"),
      api.get<Project[]>("/projects"),
    ]).then(([deptData, projData]) => {
      setDepartments(deptData);
      setProjects(projData);

      if (deptData.length > 0) {
        const saved = lastDeptId && deptData.find((d) => d.id === lastDeptId);
        if (saved) {
          setDepartmentId(saved.id);
        } else {
          const fallback = deptData.find((d) => d.name === "課程");
          setDepartmentId(fallback ? fallback.id : deptData[0].id);
        }
      }

      if (projData.length > 0) {
        const saved = lastProjId && projData.find((p) => p.id === lastProjId);
        if (saved) {
          setProjectId(saved.id);
        } else {
          const fallback = projData.find((p) => p.code === "P000");
          setProjectId(fallback ? fallback.id : projData[0].id);
        }
      }

      setLoading(false);
    });
    // Mount-only: fetch reference data once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply prefill from selected todo
  useEffect(() => {
    if (prefill) {
      setDepartmentId(prefill.departmentId);
      setPlannedTitle(prefill.plannedTitle);
      setTodoId(prefill.todoId);
    }
  }, [prefill]);

  // Sort departments A-Z by short label
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      const la = getDeptConfig(a.name).label;
      const lb = getDeptConfig(b.name).label;
      return la.localeCompare(lb);
    });
  }, [departments]);

  // All non-archived projects sorted A-Z by name
  const sortedProjects = useMemo(() => {
    return projects
      .filter((p) => !p.is_archived)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [projects]);

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
      todoId,
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

  // ─── Loading skeleton ──────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 lg:p-8 pb-16">
        <div className="w-full max-w-md space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl skeleton" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 rounded skeleton" />
              <div className="h-3 w-36 rounded skeleton" />
            </div>
          </div>
          {/* Department skeleton */}
          <div>
            <div className="h-3 w-20 rounded skeleton mb-2" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex-1 h-12 rounded-lg skeleton" />
              ))}
            </div>
          </div>
          {/* Project skeleton */}
          <div>
            <div className="h-3 w-16 rounded skeleton mb-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-9 rounded-lg skeleton" style={{ width: `${60 + (i % 3) * 20}px` }} />
              ))}
            </div>
          </div>
          {/* Duration skeleton */}
          <div>
            <div className="h-3 w-16 rounded skeleton mb-2" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex-1 h-10 rounded-lg skeleton" />
              ))}
            </div>
          </div>
          {/* Goal skeleton */}
          <div>
            <div className="h-3 w-10 rounded skeleton mb-1.5" />
            <div className="h-12 w-full rounded-md skeleton" />
          </div>
          {/* Button skeleton */}
          <div className="h-12 w-full rounded-md skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4 lg:p-8 pb-16">
      <motion.form
        onSubmit={handleStart}
        className="w-full max-w-md space-y-6"
        variants={idleFormStagger}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div className="flex items-center gap-3" variants={idleFormItem}>
          <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
            <Clock size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-serif font-semibold text-text-primary">New Session</h2>
            <p className="text-xs text-text-tertiary">Set up your focus block</p>
          </div>
        </motion.div>

        {/* Department — quick buttons A-Z */}
        <motion.div variants={idleFormItem}>
          <label className="block label-caps mb-2">Department</label>
          <div className="flex gap-2">
            {sortedDepartments.map((d) => {
              const cfg = getDeptConfig(d.name);
              const selected = departmentId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartmentId(d.id)}
                  className={`flex-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                    selected
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border bg-bg text-text-secondary hover:bg-surface"
                  }`}
                >
                  <span className="block text-sm font-semibold leading-tight">{cfg.label}</span>
                  <span className={`block text-[10px] leading-tight mt-0.5 ${selected ? "text-accent/70" : "text-text-tertiary"}`}>
                    {cfg.dailyHours}h / day
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Project — all projects A-Z */}
        <motion.div variants={idleFormItem}>
          <label className="block label-caps mb-2">Project</label>
          <div className="flex flex-wrap gap-2">
            {sortedProjects.map((p) => {
              const selected = projectId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProjectId(p.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border bg-bg text-text-secondary hover:bg-surface"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Duration */}
        <motion.div variants={idleFormItem}>
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
        </motion.div>

        {/* Planned Goal */}
        <motion.div variants={idleFormItem}>
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
        </motion.div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <motion.div variants={idleFormItem}>
          <motion.button
            type="submit"
            disabled={starting || !departmentId || !projectId || !plannedTitle.trim()}
            className="btn-primary inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 font-serif font-semibold"
            whileTap={tapScaleSmall}
          >
            <Play size={16} strokeWidth={2.5} />
            {starting ? "Starting..." : "Start Focus"}
          </motion.button>
        </motion.div>

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
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
