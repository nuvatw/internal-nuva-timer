import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useTimer, type StartParams } from "../hooks/useTimer";
import { useAlarm } from "../hooks/useAlarm";
import { useMultiTab } from "../hooks/useMultiTab";
import AlarmOverlay from "../components/AlarmOverlay";
import CompletionModal from "../components/CompletionModal";

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
    <form onSubmit={handleStart} className="p-6 space-y-5">
      {/* Department */}
      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <select
          id="department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Project */}
      <div>
        <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
          Project
        </label>
        <select
          id="project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} — ` : ""}{p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          Duration
        </legend>
        <div className="flex gap-4">
          {([30, 60] as const).map((min) => (
            <label
              key={min}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                duration === min
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
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
      </fieldset>

      {/* Planned Goal */}
      <div>
        <label htmlFor="planned-title" className="block text-sm font-medium text-gray-700 mb-1">
          Planned Goal
        </label>
        <input
          id="planned-title"
          type="text"
          required
          value={plannedTitle}
          onChange={(e) => setPlannedTitle(e.target.value)}
          placeholder="What will you focus on?"
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Start */}
      <button
        type="submit"
        disabled={starting || !departmentId || !projectId || !plannedTitle.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {starting ? "Starting..." : "Start Timer"}
      </button>
    </form>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-desc"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg space-y-4">
        <h3 id="cancel-title" className="text-lg font-semibold text-gray-900">
          Cancel session?
        </h3>
        <p id="cancel-desc" className="text-sm text-gray-500">
          Elapsed time will be saved as a canceled session.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            ref={dismissRef}
            onClick={onDismiss}
            disabled={canceling}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={canceling}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {canceling ? "Canceling..." : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      {/* Session info */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          {departmentName} &rsaquo; {projectCode ?? projectName}
        </p>
        <p className="mt-1 text-sm text-gray-700 italic">
          &ldquo;{plannedTitle}&rdquo;
        </p>
      </div>

      {/* Countdown */}
      <div
        className="text-center"
        role="timer"
        aria-live="polite"
        aria-label={`${formatTime(remainingSeconds)} remaining`}
      >
        <span
          className={`text-6xl font-mono font-bold tabular-nums tracking-tight transition-colors ${
            isPaused ? "text-amber-600" : "text-gray-900"
          }`}
        >
          {formatTime(remainingSeconds)}
        </span>
        {isPaused && (
          <p className="mt-2 text-sm font-medium text-amber-600 animate-pulse">
            Paused
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isPaused ? "bg-amber-400" : "bg-indigo-500"
            }`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{durationMinutes} min session</span>
          <span>Elapsed: {formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!isPaused ? (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? "Pausing..." : "Pause"}
          </button>
        ) : (
          <button
            onClick={handleResume}
            disabled={actionLoading}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? "Resuming..." : "Resume"}
          </button>
        )}
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={actionLoading}
          className="rounded-lg border border-red-200 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <CancelModal
          onConfirm={onCancel}
          onDismiss={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
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
  const { otherTabActive } = useMultiTab(status === "running" || status === "paused");
  const [finishedPhase, setFinishedPhase] = useState<FinishedPhase | null>(null);

  // When status transitions to "finished", trigger alarm
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (status === "finished" && prevStatusRef.current !== "finished") {
      setFinishedPhase("alarm");
      alarm.play();
    }
    prevStatusRef.current = status;
  }, [status, alarm]);

  // Also check on mount — if we reload and timer is already finished
  useEffect(() => {
    if (status === "finished" && finishedPhase === null) {
      setFinishedPhase("alarm");
      alarm.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrap start to also prepare audio
  const handleStart = useCallback(
    async (params: StartParams) => {
      alarm.prepare();
      await start(params);
    },
    [alarm, start]
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

      setFinishedPhase(null);
      reset();
    },
    [timerState, reset]
  );

  // ─── Render states ─────────────────────────

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
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500">Session ended</p>
          <span className="text-4xl font-mono font-bold text-gray-300">00:00</span>
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
        onCancel={cancel}
      />
    );
  }

  // Idle
  return (
    <>
      {otherTabActive && (
        <div
          className="mx-6 mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          A timer is running in another tab. Starting a new timer here may cause conflicts.
        </div>
      )}
      <IdleState onStart={handleStart} />
    </>
  );
}
