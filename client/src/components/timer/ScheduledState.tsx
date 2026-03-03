import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Timer, X } from "lucide-react";
import { formatTime } from "../../lib/dates";

interface ScheduledStateProps {
  scheduledStartTime: string; // ISO
  departmentName: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  durationMinutes: number;
  onCancel: () => void;
}

export default function ScheduledState({
  scheduledStartTime,
  departmentName,
  projectCode,
  projectName,
  plannedTitle,
  durationMinutes,
  onCancel,
}: ScheduledStateProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((new Date(scheduledStartTime).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      const diff = Math.max(0, Math.ceil((new Date(scheduledStartTime).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);
    }, 1000);
    return () => clearInterval(id);
  }, [scheduledStartTime]);

  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 lg:p-8 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Icon */}
      <motion.div
        className="h-16 w-16 rounded-2xl bg-accent-muted flex items-center justify-center text-accent"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
      >
        <Timer size={28} strokeWidth={1.75} />
      </motion.div>

      {/* Label */}
      <motion.p
        className="text-xs font-medium text-text-tertiary uppercase tracking-wider"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Scheduled start
      </motion.p>

      {/* Countdown */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="font-mono text-5xl font-bold text-text-primary tracking-tight tabular-nums">
          {mm}
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            :
          </motion.span>
          {ss}
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Starting at {formatTime(scheduledStartTime)}
        </p>
      </motion.div>

      {/* Session info */}
      <motion.div
        className="w-full max-w-xs rounded-lg border border-border bg-surface p-4 space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex justify-between text-xs">
          <span className="text-text-tertiary">Department</span>
          <span className="text-text-secondary font-medium">{departmentName}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-tertiary">Project</span>
          <span className="text-text-secondary font-medium">
            {projectCode ? `${projectCode} — ` : ""}{projectName}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-tertiary">Duration</span>
          <span className="text-text-secondary font-medium">{durationMinutes} min</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-tertiary">Goal</span>
          <span className="text-text-secondary font-medium truncate ml-4">{plannedTitle}</span>
        </div>
      </motion.div>

      {/* Cancel */}
      <motion.button
        onClick={onCancel}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-6 py-2.5 text-sm font-medium text-text-tertiary hover:text-destructive hover:border-destructive hover:bg-destructive-muted transition-colors active:scale-[0.97]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <X size={16} strokeWidth={2} />
        Cancel
      </motion.button>
    </motion.div>
  );
}
