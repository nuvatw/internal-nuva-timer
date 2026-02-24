import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { toast } from "../contexts/ToastContext";
import { useSfx } from "../contexts/SfxContext";
import { useProgress, type GamificationResult } from "../contexts/ProgressContext";
import { api } from "../lib/api";
import { formatCountdown } from "../lib/dates";
import {
  runningEnterVariants,
  completionBackdropVariants,
  completionSpringTransition,
} from "../lib/motion";
import { useTimer, type StartParams } from "../hooks/useTimer";
import { useMultiTab } from "../hooks/useMultiTab";
import CompletionModal from "../components/CompletionModal";
import CircularProgress from "../components/CircularProgress";
import CountdownDigits from "../components/timer/CountdownDigits";
import DailyProgress from "../components/DailyProgress";
import IdleForm from "../components/timer/IdleForm";
import RunningState from "../components/timer/RunningState";

// ─── Timer Page ────────────────────────────

export default function TimerPage() {
  const {
    timerState,
    status,
    remainingSeconds,
    progress,
    start,
    pause,
    resume,
    cancel,
    reset,
  } = useTimer();

  const { playStart, playComplete } = useSfx();
  const { applyGamification, refresh: refreshProgress } = useProgress();
  const { otherTabActive, notifyStateChanged } = useMultiTab(status === "running" || status === "paused");
  const [showCompletion, setShowCompletion] = useState(false);

  // Dynamic document title
  useDocumentTitle(
    status === "running" || status === "paused"
      ? `${formatCountdown(remainingSeconds)} ${status === "paused" ? "(Paused)" : ""} — Timer`
      : "Timer"
  );

  // Auto-complete: when timer finishes, play sound and show completion modal
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (status === "finished" && prevStatusRef.current !== "finished") {
      playComplete();
      setShowCompletion(true);
    }
    prevStatusRef.current = status;
  }, [status, playComplete]);

  // Handle page reload while in finished state
  useEffect(() => {
    if (status === "finished" && !showCompletion) {
      setShowCompletion(true);
    }
    // Mount-only: recover showCompletion flag after page reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(
    async (params: StartParams) => {
      await start(params);
      playStart();
      notifyStateChanged();
    },
    [start, playStart, notifyStateChanged]
  );

  const handleComplete = useCallback(
    async (data: { completed: boolean; actualTitle?: string; notes?: string }) => {
      if (!timerState) return;

      const result = await api.post<{ gamification?: GamificationResult }>(
        `/sessions/${timerState.sessionId}/complete`,
        {
          completed: data.completed,
          actual_title: data.actualTitle,
          notes: data.notes,
        },
      );

      if (result.gamification) {
        applyGamification(result.gamification);
      }
      toast.success(data.completed ? "Session completed" : "Session saved");

      await refreshProgress();
      setShowCompletion(false);
      reset();
      notifyStateChanged();
    },
    [timerState, reset, notifyStateChanged, applyGamification, refreshProgress]
  );

  // ─── Finished state with CompletionModal ──
  if (status === "finished" && showCompletion && timerState) {
    return (
      <>
        <motion.div
          className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 lg:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <CircularProgress progress={1} paused={false} label="Session complete">
              <div className="text-center">
                <CountdownDigits seconds={0} paused={false} />
                <motion.p
                  className="mt-1 text-xs text-text-tertiary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Complete
                </motion.p>
              </div>
            </CircularProgress>
          </motion.div>
        </motion.div>
        <motion.div
          variants={completionBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <CompletionModal
            plannedTitle={timerState.plannedTitle}
            onSave={handleComplete}
          />
        </motion.div>
      </>
    );
  }

  // ─── Idle / Running states ────────────────
  return (
    <AnimatePresence mode="wait">
      {(status === "running" || status === "paused") ? (
        <motion.div
          key="running"
          variants={runningEnterVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <RunningState
            remainingSeconds={remainingSeconds}
            progress={progress}
            status={status}
            departmentName={timerState!.departmentName}
            projectCode={timerState!.projectCode}
            projectName={timerState!.projectName}
            plannedTitle={timerState!.plannedTitle}
            durationMinutes={timerState!.durationMinutes}
            startedAt={timerState!.startedAt}
            pausedTotalSeconds={timerState!.pausedTotalSeconds}
            onPause={pause}
            onResume={resume}
            onCancel={async () => { await cancel(); notifyStateChanged(); toast("Session canceled"); }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {otherTabActive && (
            <div
              className="mx-4 lg:mx-8 mt-6 rounded-lg border border-amber-300 bg-warning-muted px-4 py-3 text-sm text-amber-800 flex items-center gap-2"
              role="alert"
            >
              <AlertTriangle size={16} strokeWidth={2} className="shrink-0" />
              A timer is running in another tab. Starting a new timer here may cause conflicts.
            </div>
          )}
          <DailyProgress />
          <IdleForm onStart={handleStart} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
