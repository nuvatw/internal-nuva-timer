import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 lg:p-8 gap-6"
    >
      {/* Daily progress (compact) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <DailyProgress compact />
      </motion.div>

      {/* Session context */}
      <motion.div
        className="text-center space-y-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          {departmentName} &middot; {projectCode ?? projectName}
        </p>
        <p className="text-sm text-text-secondary max-w-xs">
          {plannedTitle}
        </p>
      </motion.div>

      {/* Circular timer */}
      <CircularProgress progress={progress} paused={isPaused} label="Session progress">
        <div
          role="timer"
          aria-live="polite"
          aria-label={`${formatCountdown(remainingSeconds)} remaining`}
          className="text-center"
        >
          <CountdownDigits seconds={remainingSeconds} paused={isPaused} />
          <AnimatePresence>
            {isPaused && (
              <motion.p
                className="mt-1 text-xs font-medium text-warning"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                }}
              >
                PAUSED
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </CircularProgress>

      {/* Session time range */}
      <motion.p
        className="text-xs text-text-tertiary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {formatTime(startedAt)} – {formatTime(expectedEnd)} &middot; {durationMinutes} min
      </motion.p>

      {/* Controls */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <AnimatePresence mode="wait">
          {!isPaused ? (
            <motion.button
              key="pause"
              onClick={handlePause}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised disabled:opacity-50 transition-colors active:scale-[0.97]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Pause size={16} strokeWidth={2} />
              {actionLoading ? "..." : "Pause"}
            </motion.button>
          ) : (
            <motion.button
              key="resume"
              onClick={handleResume}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors active:scale-[0.97]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Play size={16} strokeWidth={2} />
              {actionLoading ? "..." : "Resume"}
            </motion.button>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-tertiary hover:text-destructive hover:border-destructive hover:bg-destructive-muted disabled:opacity-50 transition-colors active:scale-[0.97]"
        >
          <X size={16} strokeWidth={2} />
          Cancel
        </button>
      </motion.div>

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
