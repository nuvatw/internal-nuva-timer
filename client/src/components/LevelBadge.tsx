import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useProgress } from "../contexts/ProgressContext";
import { getLevelTitle } from "@nuva/shared/game";
import { getLevelTierColors } from "../lib/tier-colors";

export default function LevelBadge() {
  const { progress, loading, levelChanged } = useProgress();
  const barWidth = useMotionValue(0);
  const [displayPct, setDisplayPct] = useState(0);
  const prevLevelRef = useRef<number | null>(null);

  const level = progress?.current_level ?? 1;
  const totalXp = progress?.total_xp ?? 0;
  const xpCurrentLevel = progress?.xp_current_level ?? 0;
  const xpNextLevel = progress?.xp_next_level ?? 10;
  const xpInLevel = totalXp - xpCurrentLevel;
  const xpNeeded = xpNextLevel - xpCurrentLevel;
  const fillPct = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 0;
  const title = getLevelTitle(level);
  const tier = getLevelTierColors(level);

  useEffect(() => {
    if (loading || !progress) return;

    const prevLevel = prevLevelRef.current;
    prevLevelRef.current = level;

    // Level-cross animation: fill to 100%, pause, reset to 0, fill to new %
    if (prevLevel !== null && levelChanged && prevLevel < level) {
      // Fill to 100%
      const ctrl = animate(barWidth, 100, {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => setDisplayPct(v),
        onComplete: () => {
          // Pause, then reset and fill to new value
          setTimeout(() => {
            barWidth.jump(0);
            setDisplayPct(0);
            setTimeout(() => {
              animate(barWidth, fillPct * 100, {
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
                onUpdate: (v) => setDisplayPct(v),
              });
            }, 100);
          }, 200);
        },
      });
      return () => ctrl.stop();
    }

    // Normal fill animation
    const ctrl = animate(barWidth, fillPct * 100, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayPct(v),
    });
    return () => ctrl.stop();
  }, [fillPct, level, loading, progress, levelChanged, barWidth]);

  if (loading || !progress) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-5 w-8 rounded bg-surface-raised animate-pulse" />
        <div className="hidden sm:block w-16 h-1 rounded-full bg-surface-raised animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 group relative outline-none"
      role="group"
      tabIndex={0}
      aria-label={`Level ${level} — ${title}. ${xpInLevel} of ${xpNeeded} XP to next level.`}
    >
      {/* Level badge */}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tier.text} ${tier.bg}`}>
        Lv.{level}
      </span>

      {/* XP bar — hidden on very small screens */}
      <div className="hidden sm:block w-16 h-1 rounded-full bg-surface-raised overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${tier.bar}`}
          style={{ width: `${displayPct}%` }}
          role="progressbar"
          aria-valuenow={xpInLevel}
          aria-valuemin={0}
          aria-valuemax={xpNeeded}
        />
      </div>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
        <div className="rounded-lg bg-text-primary text-bg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
          <p className="font-semibold">Level {level} — {title}</p>
          <p className="text-text-inverted/70 mt-0.5">{xpInLevel} / {xpNeeded} XP to next level</p>
        </div>
      </div>
    </div>
  );
}
