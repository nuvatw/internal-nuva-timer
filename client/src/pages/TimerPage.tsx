import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, AlertTriangle, Clock } from "lucide-react";
import { useHotkeys } from "../hooks/useHotkeys";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { toast } from "../contexts/ToastContext";
import { api } from "../lib/api";
import { useTimer, type StartParams } from "../hooks/useTimer";
import { useAlarm } from "../hooks/useAlarm";
import { useMultiTab } from "../hooks/useMultiTab";
import AlarmOverlay from "../components/AlarmOverlay";
import CompletionModal from "../components/CompletionModal";
import CircularProgress from "../components/CircularProgress";
import { overlayVariants, modalVariants, modalTransition, tapScale } from "../lib/motion";

// ─── Types ─────────────────────────────────

interface Department {
  id: string;
  name: string;
}

interface Project {
  id: string;
  code: string | null;
  name: string;
}

// ─── Helpers ───────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Idle Form ─────────────────────────────

function IdleState({ onStart }: { onStart: (p: StartParams) => Promise<void> }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [plannedTitle, setPlannedTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Department[]>("/departments").then((data) => {
      setDepartments(data);
      if (data.length > 0 && !departmentId) setDepartmentId(data[0].id);
    });
    api.get<Project[]>("/projects").then((data) => {
      setProjects(data);
      if (data.length > 0 && !projectId) setProjectId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !projectId || !plannedTitle.trim()) return;

    setStarting(true);
    setError("");

    const dept = departments.find((d) => d.id === departmentId)!;
    const proj = projects.find((p) => p.id === projectId)!;

    try {
      await onStart({
        departmentId,
        departmentName: dept.name,
        projectId,
        projectCode: proj.code,
        projectName: proj.name,
        durationMinutes: duration,
        plannedTitle: plannedTitle.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStarting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-2rem)] p-4 lg:p-8">
      <motion.form
        onSubmit={handleStart}
        className="w-full max-w-md space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
            <Clock size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">New Session</h2>
            <p className="text-xs text-text-tertiary">Set up your focus block</p>
          </div>
        </div>

        {/* Department + Project row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="department" className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-bg focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="project" className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
              Project
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm bg-bg focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none"
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
          <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
            Duration
          </label>
          <div className="flex gap-3">
            {([30, 60] as const).map((min) => (
              <label
                key={min}
                className={`flex-1 flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${
                  duration === min
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-bg text-text-secondary hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="duration"
                  value={min}
                  checked={duration === min}
                  onChange={() => setDuration(min)}
                  className="sr-only"
                />
                {min} min
              </label>
            ))}
          </div>
        </div>

        {/* Planned Goal */}
        <div>
          <label htmlFor="planned-title" className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
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
            className="w-full rounded-lg border border-border px-3 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <motion.button
          type="submit"
          disabled={starting || !departmentId || !projectId || !plannedTitle.trim()}
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-semibold text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
          whileTap={tapScale}
        >
          <Play size={16} strokeWidth={2.5} />
          {starting ? "Starting..." : "Start Focus"}
        </motion.button>
      </motion.form>
    </div>
  );
}

// ─── Cancel Confirmation Modal ─────────────

function CancelModal({
  onConfirm,
  onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [canceling, setCanceling] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onDismiss]);

  const handleConfirm = async () => {
    setCanceling(true);
    try {
      await onConfirm();
    } catch {
      setCanceling(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-desc"
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={modalTransition}
    >
      <motion.div
        className="w-full max-w-sm rounded-xl bg-bg p-6 shadow-lg space-y-4"
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={modalTransition}
      >
        <h3 id="cancel-title" className="text-lg font-semibold text-text-primary">
          Cancel session?
        </h3>
        <p id="cancel-desc" className="text-sm text-text-secondary">
          Elapsed time will be saved as a canceled session.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={dismissRef}
            onClick={onDismiss}
            disabled={canceling}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={canceling}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {canceling ? "Canceling..." : "Yes, Cancel"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Running State ─────────────────────────

function RunningState({
  remainingSeconds,
  elapsedSeconds,
  progress,
  status,
  departmentName,
  projectCode,
  projectName,
  plannedTitle,
  durationMinutes,
  onPause,
  onResume,
  onCancel,
}: {
  remainingSeconds: number;
  elapsedSeconds: number;
  progress: number;
  status: "running" | "paused";
  departmentName: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  durationMinutes: number;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onCancel: () => Promise<void>;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const isPaused = status === "paused";

  const handlePause = useCallback(async () => {
    setActionLoading(true);
    try {
      await onPause();
    } catch { /* ignore */ }
    setActionLoading(false);
  }, [onPause]);

  const handleResume = useCallback(async () => {
    setActionLoading(true);
    try {
      await onResume();
    } catch { /* ignore */ }
    setActionLoading(false);
  }, [onResume]);

  // Space to toggle pause/resume
  useHotkeys(
    "space",
    useCallback(() => {
      if (actionLoading) return;
      if (isPaused) handleResume();
      else handlePause();
    }, [isPaused, actionLoading, handlePause, handleResume]),
    { preventDefault: true }
  );

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-4 lg:p-8 gap-8"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Session context */}
      <div className="text-center space-y-1">
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          {departmentName} &middot; {projectCode ?? projectName}
        </p>
        <p className="text-sm text-text-secondary max-w-xs">
          {plannedTitle}
        </p>
      </div>

      {/* Circular timer */}
      <CircularProgress progress={progress} paused={isPaused}>
        <div
          role="timer"
          aria-live="polite"
          aria-label={`${formatTime(remainingSeconds)} remaining`}
          className="text-center"
        >
          <span
            className={`text-6xl font-mono font-bold tabular-nums tracking-tighter transition-colors duration-300 ${
              isPaused ? "text-warning" : "text-text-primary"
            }`}
          >
            {formatTime(remainingSeconds)}
          </span>
          {isPaused ? (
            <p className="mt-1 text-xs font-medium text-warning animate-pulse">
              PAUSED
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-tertiary">
              {formatElapsed(elapsedSeconds)} elapsed
            </p>
          )}
        </div>
      </CircularProgress>

      {/* Session duration label */}
      <p className="text-xs text-text-tertiary">
        {durationMinutes} min session
      </p>

      {/* Controls */}
      <div className="flex gap-3">
        {!isPaused ? (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors"
          >
            <Pause size={16} strokeWidth={2} />
            {actionLoading ? "..." : "Pause"}
          </button>
        ) : (
          <button
            onClick={handleResume}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Play size={16} strokeWidth={2} />
            {actionLoading ? "..." : "Resume"}
          </button>
        )}
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-tertiary hover:text-destructive hover:border-destructive hover:bg-destructive-muted disabled:opacity-50 transition-colors"
        >
          <X size={16} strokeWidth={2} />
          Cancel
        </button>
      </div>

      <AnimatePresence>
        {showCancelConfirm && (
          <CancelModal
            onConfirm={onCancel}
            onDismiss={() => setShowCancelConfirm(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Timer Page ────────────────────────────

type FinishedPhase = "alarm" | "completion";

export default function TimerPage() {
  const {
    timerState,
    status,
    remainingSeconds,
    elapsedSeconds,
    progress,
    start,
    pause,
    resume,
    cancel,
    reset,
  } = useTimer();

  const alarm = useAlarm();
  const { otherTabActive, notifyStateChanged } = useMultiTab(status === "running" || status === "paused");
  const [finishedPhase, setFinishedPhase] = useState<FinishedPhase | null>(null);

  // Dynamic document title
  useDocumentTitle(
    status === "running" || status === "paused"
      ? `${formatTime(remainingSeconds)} ${status === "paused" ? "(Paused)" : ""} — Timer`
      : "Timer"
  );

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (status === "finished" && prevStatusRef.current !== "finished") {
      setFinishedPhase("alarm");
      alarm.play();
    }
    prevStatusRef.current = status;
  }, [status, alarm]);

  useEffect(() => {
    if (status === "finished" && finishedPhase === null) {
      setFinishedPhase("alarm");
      alarm.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(
    async (params: StartParams) => {
      alarm.prepare();
      await start(params);
      notifyStateChanged();
    },
    [alarm, start, notifyStateChanged]
  );

  const handleStopAlarm = useCallback(() => {
    alarm.stop();
    setFinishedPhase("completion");
  }, [alarm]);

  const handleComplete = useCallback(
    async (data: { completed: boolean; actualTitle?: string; notes?: string }) => {
      if (!timerState) return;

      await api.post(`/sessions/${timerState.sessionId}/complete`, {
        completed: data.completed,
        actual_title: data.actualTitle,
        notes: data.notes,
      });

      toast.success(data.completed ? "Session completed" : "Session saved");
      setFinishedPhase(null);
      reset();
      notifyStateChanged();
    },
    [timerState, reset, notifyStateChanged]
  );

  // Alarm overlay
  if (status === "finished" && finishedPhase === "alarm" && timerState) {
    return (
      <AlarmOverlay
        departmentName={timerState.departmentName}
        projectCode={timerState.projectCode}
        projectName={timerState.projectName}
        plannedTitle={timerState.plannedTitle}
        onStop={handleStopAlarm}
      />
    );
  }

  // Completion modal
  if (status === "finished" && finishedPhase === "completion" && timerState) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-4 lg:p-8">
          <CircularProgress progress={1} paused={false}>
            <div className="text-center">
              <span className="text-6xl font-mono font-bold tabular-nums tracking-tighter text-text-tertiary/30">
                00:00
              </span>
              <p className="mt-1 text-xs text-text-tertiary">Complete</p>
            </div>
          </CircularProgress>
        </div>
        <CompletionModal
          plannedTitle={timerState.plannedTitle}
          onSave={handleComplete}
        />
      </>
    );
  }

  // Running / paused
  if (status === "running" || status === "paused") {
    return (
      <RunningState
        remainingSeconds={remainingSeconds}
        elapsedSeconds={elapsedSeconds}
        progress={progress}
        status={status}
        departmentName={timerState!.departmentName}
        projectCode={timerState!.projectCode}
        projectName={timerState!.projectName}
        plannedTitle={timerState!.plannedTitle}
        durationMinutes={timerState!.durationMinutes}
        onPause={pause}
        onResume={resume}
        onCancel={async () => { await cancel(); notifyStateChanged(); toast("Session canceled"); }}
      />
    );
  }

  // Idle
  return (
    <>
      {otherTabActive && (
        <div
          className="mx-4 lg:mx-8 mt-6 rounded-lg border border-amber-300 bg-warning-muted px-4 py-3 text-sm text-amber-800 flex items-center gap-2"
          role="alert"
        >
          <AlertTriangle size={16} strokeWidth={2} className="shrink-0" />
          A timer is running in another tab. Starting a new timer here may cause conflicts.
        </div>
      )}
      <IdleState onStart={handleStart} />
    </>
  );
}
