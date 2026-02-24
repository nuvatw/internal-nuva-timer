import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { useProgress } from "../contexts/ProgressContext";
import { getCurrentMultiplier } from "@nuva/shared/game";
import { formatMinutes } from "../lib/dates";
import AnimatedNumber from "./AnimatedNumber";

// ─── Tomato Dot ─────────────────────────────

function TomatoDot({ earned, index }: { earned: boolean; index: number }) {
  return (
    <motion.div
      className={`h-3.5 w-3.5 rounded-full transition-colors ${
        earned
          ? "bg-accent shadow-sm shadow-accent/25"
          : "border border-border-subtle bg-transparent"
      }`}
      initial={earned ? { scale: 0 } : false}
      animate={earned ? { scale: 1 } : undefined}
      transition={
        earned
          ? {
              type: "spring",
              stiffness: 500,
              damping: 20,
              delay: index * 0.04,
            }
          : undefined
      }
      aria-hidden="true"
    />
  );
}

// ─── Component ──────────────────────────────

export default function DailyProgress({ compact }: { compact?: boolean }) {
  const { progress, loading } = useProgress();

  if (loading || !progress) {
    return compact ? (
      <div className="text-center space-y-1.5">
        <div className="h-4 w-32 mx-auto rounded bg-surface-raised animate-pulse" />
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-surface-raised animate-pulse" />
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center space-y-3 py-6" role="status" aria-label="Loading">
        <div className="h-5 w-40 mx-auto rounded bg-surface-raised animate-pulse" />
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-3.5 w-3.5 rounded-full bg-surface-raised animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { daily_focus_minutes, daily_tomatoes, daily_xp, tomato_goal, current_multiplier } = progress;
  const multiplier = current_multiplier ?? getCurrentMultiplier(daily_focus_minutes);
  const displayGoal = Math.max(tomato_goal, daily_tomatoes);
  const dots = Array.from({ length: displayGoal }, (_, i) => i < daily_tomatoes);

  if (compact) {
    return (
      <div className="text-center space-y-1.5">
        <p className="text-xs text-text-tertiary">
          {formatMinutes(daily_focus_minutes)} focused today
        </p>
        <div
          className="flex flex-col items-center gap-1"
          role="img"
          aria-label={`${daily_tomatoes} of ${tomato_goal} tomatoes earned today`}
        >
          {Array.from({ length: Math.ceil(displayGoal / 10) }, (_, row) => (
            <div key={row} className="flex items-center justify-center gap-1">
              {dots.slice(row * 10, row * 10 + 10).map((earned, i) => (
                <div
                  key={row * 10 + i}
                  className={`h-2 w-2 rounded-full ${
                    earned
                      ? "bg-accent/70"
                      : "border border-border-subtle bg-transparent"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="text-center space-y-3 py-6"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Daily minutes + multiplier */}
      <div className="flex items-center justify-center gap-3">
        <p className="text-sm text-text-secondary">
          Today:{" "}
          <AnimatedNumber
            value={daily_focus_minutes}
            format={(n) => formatMinutes(Math.round(n))}
            className="font-semibold text-text-primary"
          />{" "}
          focused
        </p>
        {multiplier > 1 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5">
            <Zap size={11} strokeWidth={2.5} />
            {multiplier}x
          </span>
        )}
      </div>

      {/* Tomato grid — 10 per row */}
      <div className="space-y-1.5">
        <div
          className="flex flex-col items-center gap-1.5"
          role="img"
          aria-label={`${daily_tomatoes} of ${tomato_goal} tomatoes earned today`}
        >
          {Array.from({ length: Math.ceil(displayGoal / 10) }, (_, row) => (
            <div key={row} className="flex items-center justify-center gap-1.5">
              {dots.slice(row * 10, row * 10 + 10).map((earned, i) => (
                <TomatoDot key={row * 10 + i} earned={earned} index={row * 10 + i} />
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-text-tertiary">
          {daily_tomatoes}/{tomato_goal}
        </p>
      </div>

      {/* Daily XP */}
      {daily_xp > 0 && (
        <p className="text-xs text-text-tertiary flex items-center justify-center gap-1">
          <Sparkles size={12} strokeWidth={2} className="text-accent" />
          +<AnimatedNumber value={daily_xp} /> XP earned today
        </p>
      )}
    </motion.div>
  );
}
