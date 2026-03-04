import { useCallback, useMemo, useState } from "react";
import { Play, Pause, X } from "lucide-react";
import { useHotkeys } from "../../hooks/useHotkeys";
import { formatCountdown, formatTime } from "../../lib/dates";
import CircularProgress from "../CircularProgress";
import DailyProgress from "../DailyProgress";
import CountdownDigits from "./CountdownDigits";
import CancelModal from "./CancelModal";

interface RunningStateProps {
  remainingSeconds: number;
  progress: number;
  status: "running" | "paused";
  departmentName: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  durationMinutes: number;
  startedAt: string;
  pausedTotalSeconds: number;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onCancel: () => Promise<void>;
}

export default function RunningState({
  remainingSeconds,
  progress,
  status,
  departmentName,
  projectCode,
  projectName,
  plannedTitle,
  durationMinutes,
  startedAt,
  pausedTotalSeconds,
  onPause,
  onResume,
  onCancel,
}: RunningStateProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const isPaused = status === "paused";

  const expectedEnd = useMemo(() => {
    const startMs = new Date(startedAt).getTime();
    const endMs = startMs + durationMinutes * 60 * 1000 + pausedTotalSeconds * 1000;
    return new Date(endMs).toISOString();
  }, [startedAt, durationMinutes, pausedTotalSeconds]);

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
    <div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 lg:p-8 gap-6"
    >
      {/* Daily progress (compact) */}
      <div style={{ animation: "fade-slide-in 400ms cubic-bezier(0.16,1,0.3,1) 300ms both" }}>
        <DailyProgress compact />
      </div>

      {/* Session context */}
      <div
        className="text-center space-y-1"
        style={{ animation: "fade-slide-in 400ms cubic-bezier(0.16,1,0.3,1) 150ms both" }}
      >
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          {departmentName} &middot; {projectCode ?? projectName}
        </p>
        <p className="text-sm text-text-secondary max-w-xs">
          {plannedTitle}
        </p>
      </div>

      {/* Circular timer */}
      <CircularProgress progress={progress} paused={isPaused} label="Session progress">
        <div
          role="timer"
          aria-live="polite"
          aria-label={`${formatCountdown(remainingSeconds)} remaining`}
          className="text-center"
        >
          <CountdownDigits seconds={remainingSeconds} paused={isPaused} />
          <p className="mt-1 text-xs text-text-tertiary">
            Ends at {formatTime(expectedEnd)}
          </p>
          {isPaused && (
            <p
              className="mt-1 text-xs font-medium text-warning"
              style={{ animation: "paused-pulse 2s ease-in-out infinite" }}
            >
              PAUSED
            </p>
          )}
        </div>
      </CircularProgress>

      {/* Session time range */}
      <p
        className="text-xs text-text-tertiary"
        style={{ animation: "fade-slide-in 400ms ease 200ms both" }}
      >
        {formatTime(startedAt)} – {formatTime(expectedEnd)} &middot; {durationMinutes} min
      </p>

      {/* Controls */}
      <div
        className="flex gap-3"
        style={{ animation: "fade-slide-in 500ms cubic-bezier(0.16,1,0.3,1) 250ms both" }}
      >
        {!isPaused ? (
          <button
            key="pause"
            onClick={handlePause}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors active:scale-[0.97]"
          >
            <Pause size={16} strokeWidth={2} />
            {actionLoading ? "..." : "Pause"}
          </button>
        ) : (
          <button
            key="resume"
            onClick={handleResume}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors active:scale-[0.97]"
          >
            <Play size={16} strokeWidth={2} />
            {actionLoading ? "..." : "Resume"}
          </button>
        )}
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-tertiary hover:text-destructive hover:border-destructive hover:bg-destructive-muted disabled:opacity-50 transition-colors active:scale-[0.97]"
        >
          <X size={16} strokeWidth={2} />
          Cancel
        </button>
      </div>

      {showCancelConfirm && (
        <CancelModal
          onConfirm={onCancel}
          onDismiss={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
