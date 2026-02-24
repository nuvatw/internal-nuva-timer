import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Clock, Target } from "lucide-react";
import { useProgress } from "../contexts/ProgressContext";
import { getLevelTitle, xpForLevel, getCurrentMultiplier, LEVEL_TIERS } from "@nuva/shared/game";
import { getLevelTierColors } from "../lib/tier-colors";
import { api } from "../lib/api";
import { todayYMD, getWeekStart, formatMinutes } from "../lib/dates";
import { listVariants, listItemVariants } from "../lib/motion";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import AnimatedNumber from "../components/AnimatedNumber";

// ─── Types ─────────────────────────────────

interface SessionRow {
  id: string;
  duration_minutes: number;
  status: string;
  started_at: string;
}

type TimeFilter = "all" | "week" | "month" | "year";

// ─── Filter helpers ────────────────────────

function getFilterRange(filter: TimeFilter): { start?: string; end?: string } {
  const today = todayYMD();
  switch (filter) {
    case "week": {
      const start = getWeekStart(today);
      return { start, end: today };
    }
    case "month": {
      // First day of current month
      const start = today.slice(0, 8) + "01";
      return { start, end: today };
    }
    case "year": {
      const start = today.slice(0, 5) + "01-01";
      return { start, end: today };
    }
    default:
      return {};
  }
}

// ─── Session Dot ───────────────────────────

function SessionDot({ index }: { index: number }) {
  return (
    <motion.div
      className="h-3 w-3 rounded-full bg-accent shadow-sm shadow-accent/20"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 20,
        delay: Math.min(index * 0.02, 1),
      }}
      aria-hidden="true"
    />
  );
}

// ─── Component ─────────────────────────────

export default function LevelPage() {
  useDocumentTitle("Level");
  const { progress, loading } = useProgress();
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Fetch sessions based on filter
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const range = getFilterRange(filter);
      let path = "/sessions?limit=500";
      if (range.start) path += `&start=${range.start}`;
      if (range.end) path += `&end=${range.end}`;
      const data = await api.get<SessionRow[]>(path);
      // Only completed sessions
      setSessions(data.filter((s) => s.status === "completed_yes" || s.status === "completed_no"));
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Derived data — each circle represents 30 minutes of focus
  const totalFocusMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + s.duration_minutes, 0),
    [sessions],
  );

  const totalCircles = Math.floor(totalFocusMinutes / 30);

  if (loading || !progress) {
    return (
      <div className="p-4 lg:p-8 space-y-6 animate-pulse">
        <div className="h-48 rounded-xl bg-surface-raised" />
        <div className="h-32 rounded-xl bg-surface-raised" />
      </div>
    );
  }

  const { current_level, total_xp, xp_current_level, xp_next_level, current_streak, longest_streak, current_multiplier, daily_focus_minutes } = progress;
  const xpInLevel = total_xp - xp_current_level;
  const xpNeeded = xp_next_level - xp_current_level;
  const fillPct = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 0;
  const title = getLevelTitle(current_level);
  const tier = getLevelTierColors(current_level);
  const multiplier = current_multiplier ?? getCurrentMultiplier(daily_focus_minutes);

  const filterOptions: { value: TimeFilter; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
  ];

  return (
    <motion.div
      className="p-4 lg:p-8 space-y-6"
      variants={listVariants}
      initial="initial"
      animate="animate"
    >
      {/* ─── Level Card ─── */}
      <motion.div
        className="rounded-xl border border-border bg-bg p-6 space-y-5"
        variants={listItemVariants}
      >
        {/* Level header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-2xl ${tier.bg} flex items-center justify-center`}>
              <span className={`text-2xl font-bold ${tier.text}`}>{current_level}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Level {current_level}</h1>
              <p className={`text-sm font-medium ${tier.text}`}>{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {current_streak > 0 && (
              <div className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
                <Flame size={16} strokeWidth={2} />
                {current_streak}d
              </div>
            )}
            {multiplier > 1 && (
              <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold bg-amber-500/10 rounded-full px-2 py-0.5">
                <Zap size={12} strokeWidth={2.5} />
                {multiplier}x
              </div>
            )}
          </div>
        </div>

        {/* XP progress bar */}
        <div className="space-y-2">
          <div className="w-full h-2.5 rounded-full bg-surface-raised overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${tier.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${fillPct * 100}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              role="progressbar"
              aria-valuenow={xpInLevel}
              aria-valuemin={0}
              aria-valuemax={xpNeeded}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">
              <AnimatedNumber value={xpInLevel} className="font-semibold text-text-primary" /> / {xpNeeded} XP
            </span>
            <span className="text-text-tertiary">
              {xpNeeded - xpInLevel} XP to Level {current_level + 1}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-text-primary tabular-nums">
              <AnimatedNumber value={progress.total_focus_minutes} format={(n) => formatMinutes(Math.round(n))} />
            </p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Total Focus</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-text-primary tabular-nums">
              <AnimatedNumber value={progress.sessions_completed} />
            </p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-text-primary tabular-nums">
              <AnimatedNumber value={longest_streak} />
              <span className="text-sm font-normal text-text-tertiary">d</span>
            </p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Best Streak</p>
          </div>
        </div>
      </motion.div>

      {/* ─── Level Tiers ─── */}
      <motion.div
        className="rounded-xl border border-border bg-bg p-5 space-y-3"
        variants={listItemVariants}
      >
        <h2 className="text-sm font-semibold text-text-primary">Level Tiers</h2>
        <div className="space-y-1.5">
          {LEVEL_TIERS.map((t) => {
            const tierColors = getLevelTierColors(t.minLevel);
            const isCurrent = current_level >= t.minLevel && current_level <= t.maxLevel;
            const isReached = current_level >= t.minLevel;
            return (
              <div
                key={t.name}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isCurrent ? `${tierColors.bg} ${tierColors.text} font-semibold` : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      isReached ? tierColors.bar : "bg-border"
                    }`}
                  />
                  <span className={isReached ? "text-text-primary" : "text-text-tertiary"}>
                    {t.name}
                  </span>
                </div>
                <span className={`text-xs tabular-nums ${isCurrent ? tierColors.text : "text-text-tertiary"}`}>
                  Lv.{t.minLevel}–{t.maxLevel}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Session Circles ─── */}
      <motion.div
        className="rounded-xl border border-border bg-bg p-5 space-y-4"
        variants={listItemVariants}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Target size={16} strokeWidth={1.75} className="text-text-tertiary" />
            Focus Minutes
          </h2>

          {/* Time filter */}
          <div className="flex items-center gap-0.5 rounded-lg bg-surface-raised p-0.5">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? "bg-bg text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {sessionsLoading ? (
          <div className="h-24 rounded-lg bg-surface-raised animate-pulse" />
        ) : totalCircles === 0 ? (
          <div className="text-center py-8">
            <Clock size={24} strokeWidth={1.5} className="mx-auto text-text-tertiary/50 mb-2" />
            <p className="text-sm text-text-tertiary">No focus time yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>
                <span className="font-semibold text-text-primary">{formatMinutes(totalFocusMinutes)}</span> focused
              </span>
              <span className="text-text-tertiary">·</span>
              <span>
                <span className="font-semibold text-text-primary">{sessions.length}</span> sessions
              </span>
            </div>

            {/* Focus circles — each circle = 30 min */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                1 circle = 30 min
              </p>
              <div
                className="flex items-center gap-1.5 flex-wrap"
                role="img"
                aria-label={`${totalCircles} circles representing ${totalFocusMinutes} minutes of focus`}
              >
                {Array.from({ length: totalCircles }, (_, i) => (
                  <SessionDot key={i} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── XP Breakdown ─── */}
      <motion.div
        className="rounded-xl border border-border bg-bg p-5 space-y-3"
        variants={listItemVariants}
      >
        <h2 className="text-sm font-semibold text-text-primary">XP to Next Levels</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((offset) => {
            const lvl = current_level + offset;
            const xpRequired = xpForLevel(lvl);
            const remaining = Math.max(0, xpRequired - total_xp);
            return (
              <div key={lvl} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Level {lvl}{" "}
                  <span className="text-text-tertiary text-xs">
                    ({getLevelTitle(lvl)})
                  </span>
                </span>
                <span className="text-xs font-medium text-text-tertiary tabular-nums">
                  {remaining > 0 ? `${remaining} XP` : <span className="text-success">Reached</span>}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
