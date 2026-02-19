import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bell, Check } from "lucide-react";

interface AlarmOverlayProps {
  departmentName: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  onStop: () => void;
}

export default function AlarmOverlay({
  departmentName,
  projectCode,
  projectName,
  plannedTitle,
  onStop,
}: AlarmOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center alarm-bg"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
      aria-live="assertive"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-center space-y-6 p-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, repeatDelay: 1 }}
        >
          <Bell size={48} strokeWidth={1.5} className="text-white/90 mx-auto" aria-hidden="true" />
        </motion.div>
        <h2
          id="alarm-title"
          className="text-3xl font-bold text-white"
        >
          Time&apos;s Up!
        </h2>
        <div>
          <p className="text-white/80 text-sm">
            {departmentName} &rsaquo; {projectCode ?? projectName}
          </p>
          <p className="text-white/90 text-sm mt-1 italic">
            &ldquo;{plannedTitle}&rdquo;
          </p>
        </div>
        <button
          ref={buttonRef}
          onClick={onStop}
          className="inline-flex items-center gap-2 rounded-xl bg-bg px-8 py-4 text-lg font-bold text-accent shadow-lg hover:bg-surface focus:ring-4 focus:ring-white/50 outline-none transition-colors"
        >
          Stop Alarm
          <Check size={20} strokeWidth={2.5} />
        </button>
      </motion.div>
    </motion.div>
  );
}
