import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useSfx } from "../contexts/SfxContext";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { getLevelTitle } from "@nuva/shared/game";

interface LevelUpOverlayProps {
  levelChanged: { from: number; to: number };
  onDismiss: () => void;
}

export default function LevelUpOverlay({ levelChanged, onDismiss }: LevelUpOverlayProps) {
  const { playLevelUp } = useSfx();
  const reducedMotion = useReducedMotion();
  const dismissedRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { from, to } = levelChanged;
  const levelsGained = to - from;
  const oldTitle = getLevelTitle(from);
  const newTitle = getLevelTitle(to);
  const titleChanged = oldTitle !== newTitle;

  // Play sound + confetti on mount; clean up confetti canvas on unmount
  useEffect(() => {
    playLevelUp();

    if (!reducedMotion) {
      // Dual confetti cannon with slight delay
      const fire = (angle: number, origin: { x: number; y: number }) => {
        confetti({
          particleCount: 80,
          spread: 70,
          angle,
          origin,
          colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#fbbf24"],
          disableForReducedMotion: true,
        });
      };

      const timer = setTimeout(() => {
        fire(60, { x: 0, y: 0.65 });
        fire(120, { x: 1, y: 0.65 });
      }, 800);

      return () => {
        clearTimeout(timer);
        // Clean up confetti canvas to free memory
        confetti.reset();
      };
    }
  }, [playLevelUp, reducedMotion]);

  // Auto-dismiss after 4s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Dismiss on click or Escape
  const handleDismiss = useCallback(() => {
    if (!dismissedRef.current) {
      dismissedRef.current = true;
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleDismiss]);

  // Auto-focus the overlay so screen readers announce it
  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  return (
    <motion.div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none outline-none"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={`Level up! You reached level ${to}. ${titleChanged ? `New rank: ${newTitle}` : newTitle}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* "Congratulations" */}
        <motion.p
          className="text-sm font-medium text-white/70 uppercase tracking-widest"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {levelsGained > 1 ? `${levelsGained} Levels Gained!` : "Level Up!"}
        </motion.p>

        {/* Level number transition */}
        <div className="flex items-center gap-4">
          {/* Old level */}
          <motion.span
            className="text-5xl font-bold text-white/40 tabular-nums"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {from}
          </motion.span>

          {/* Arrow */}
          <motion.span
            className="text-2xl text-white/50"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            →
          </motion.span>

          {/* New level */}
          <motion.span
            className="text-7xl font-bold text-white tabular-nums"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.5,
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
          >
            {to}
          </motion.span>
        </div>

        {/* Title transition */}
        {titleChanged ? (
          <motion.p
            className="text-base text-white/80"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            <span className="text-white/50">{oldTitle}</span>
            <span className="mx-2 text-white/30">→</span>
            <span className="font-semibold text-white">{newTitle}</span>
          </motion.p>
        ) : (
          <motion.p
            className="text-base font-semibold text-white/80"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            {newTitle}
          </motion.p>
        )}

        {/* Dismiss hint */}
        <motion.p
          className="text-xs text-white/30 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          Tap anywhere to continue
        </motion.p>
      </div>
    </motion.div>
  );
}
