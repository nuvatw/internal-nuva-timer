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
} from "../lib/motion";
import { useTimer, type StartParams } from "../hooks/useTimer";
import { useMultiTab } from "../hooks/useMultiTab";
import CompletionModal from "../components/CompletionModal";
import CircularProgress from "../components/CircularProgress";
import CountdownDigits from "../components/timer/CountdownDigits";
import DailyProgress from "../components/DailyProgress";
import IdleForm from "../components/timer/IdleForm";
import RunningState from "../components/timer/RunningState";
import ScheduledState from "../components/timer/ScheduledState";

// ─── Scheduled start persistence ─────────
const SCHEDULE_KEY = "nuva_scheduled_start";

interface ScheduledData {
  params: import("../hooks/useTimer").StartParams;
  scheduledStartTime: string; // ISO
}

function loadSchedule(): ScheduledData | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ScheduledData;
    // Discard if already past
    if (new Date(data.scheduledStartTime).getTime() <= Date.now()) {
      localStorage.removeItem(SCHEDULE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveSchedule(data: ScheduledData | null) {
  if (data) {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(SCHEDULE_KEY);
  }
}

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
  const [scheduled, setScheduled] = useState<ScheduledData | null>(loadSchedule);

  // Persist schedule to localStorage
  useEffect(() => {
    saveSchedule(scheduled);
  }, [scheduled]);

  // Dynamic document title
  useDocumentTitle(
    scheduled
      ? "Scheduled — Timer"
      : status === "running" || status === "paused"
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

  // ─── Schedule handlers ──────────────────────
  const handleSchedule = useCallback(
    (params: StartParams, delayMinutes: number) => {
      const scheduledStartTime = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
      setScheduled({ params, scheduledStartTime });
    },
    []
  );

  const handleCancelSchedule = useCallback(() => {
    setScheduled(null);
    toast("Schedule canceled");
  }, []);

  // Countdown interval: check every second if it's time to auto-start
  useEffect(() => {
    if (!scheduled) return;

    const check = () => {
      const diff = new Date(scheduled.scheduledStartTime).getTime() - Date.now();
      if (diff <= 0) {
        const params = scheduled.params;
        setScheduled(null);
        handleStart(params);
      }
    };

    // Immediate check (e.g. page reload after time passed)
    check();

    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [scheduled, handleStart]);

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
        <CompletionModal
          plannedTitle={timerState.plannedTitle}
          onSave={handleComplete}
        />
      </>
    );
  }

  // ─── Idle / Running / Scheduled states ───
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
      ) : scheduled ? (
        <motion.div
          key="scheduled"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <ScheduledState
            scheduledStartTime={scheduled.scheduledStartTime}
            departmentName={scheduled.params.departmentName}
            projectCode={scheduled.params.projectCode}
            projectName={scheduled.params.projectName}
            plannedTitle={scheduled.params.plannedTitle}
            durationMinutes={scheduled.params.durationMinutes}
            onCancel={handleCancelSchedule}
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
          <IdleForm onStart={handleStart} onSchedule={handleSchedule} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
