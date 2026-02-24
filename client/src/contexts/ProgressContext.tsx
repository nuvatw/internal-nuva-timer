import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { ProgressData, GamificationResult } from "../types/models";

export type { GamificationResult };

interface ProgressContextValue {
  progress: ProgressData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Set after session completion; cleared after animation plays */
  lastXpGain: number | null;
  /** Set when level changes; cleared after celebration */
  levelChanged: { from: number; to: number } | null;
  /** Apply gamification result from session completion */
  applyGamification: (result: GamificationResult) => void;
  clearXpGain: () => void;
  clearLevelUp: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

// ─── Provider ───────────────────────────────

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastXpGain, setLastXpGain] = useState<number | null>(null);
  const [levelChanged, setLevelChanged] = useState<{ from: number; to: number } | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await api.get<ProgressData>("/progress");
      setProgress(data);
    } catch {
      // Silently fail — progress is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const applyGamification = useCallback((result: GamificationResult) => {
    if (result.xp_gained > 0) {
      setLastXpGain(result.xp_gained);
    }
    if (result.level_changed) {
      setLevelChanged(result.level_changed);
    }
    // Optimistically update local state
    setProgress((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        total_xp: result.total_xp,
        current_level: result.current_level,
        level_title: result.level_title,
        daily_tomatoes: prev.daily_tomatoes + result.new_tomatoes,
        daily_xp: prev.daily_xp + result.xp_gained,
      };
    });
  }, []);

  const clearXpGain = useCallback(() => setLastXpGain(null), []);
  const clearLevelUp = useCallback(() => setLevelChanged(null), []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      loading,
      refresh: fetchProgress,
      lastXpGain,
      levelChanged,
      applyGamification,
      clearXpGain,
      clearLevelUp,
    }),
    [progress, loading, fetchProgress, lastXpGain, levelChanged, applyGamification, clearXpGain, clearLevelUp],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
