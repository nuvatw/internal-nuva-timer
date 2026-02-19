import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import TimerWorker from "../lib/timer.worker?worker";

// ─── Types ─────────────────────────────────

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  sessionId: string;
  departmentId: string;
  departmentName: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  durationMinutes: number;
  startedAt: string; // ISO
  pausedAt: string | null; // ISO
  pausedTotalSeconds: number;
  status: TimerStatus;
}

interface SessionResponse {
  id: string;
  status: string;
  started_at: string;
  paused_at: string | null;
  paused_total_seconds: number;
  duration_minutes: number;
  department_id: string;
  project_id: string;
  planned_title: string;
}

export interface StartParams {
  departmentId: string;
  departmentName: string;
  projectId: string;
  projectCode: string | null;
  projectName: string;
  durationMinutes: 30 | 60;
  plannedTitle: string;
}

const STORAGE_KEY = "nuva_timer_state";

// ─── localStorage helpers ──────────────────

function loadState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: TimerState | null) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ─── Compute remaining seconds ─────────────

export function computeRemaining(state: TimerState): number {
  const durationMs = state.durationMinutes * 60 * 1000;
  const startedMs = new Date(state.startedAt).getTime();
  const now = Date.now();

  let pausedMs = state.pausedTotalSeconds * 1000;

  // If currently paused, add time since pause started
  if (state.status === "paused" && state.pausedAt) {
    pausedMs += now - new Date(state.pausedAt).getTime();
  }

  const elapsedMs = now - startedMs - pausedMs;
  const remainingMs = durationMs - elapsedMs;

  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// ─── Compute elapsed seconds (for display) ─

export function computeElapsed(state: TimerState): number {
  const startedMs = new Date(state.startedAt).getTime();
  const now = Date.now();

  let pausedMs = state.pausedTotalSeconds * 1000;
  if (state.status === "paused" && state.pausedAt) {
    pausedMs += now - new Date(state.pausedAt).getTime();
  }

  return Math.max(0, Math.floor((now - startedMs - pausedMs) / 1000));
}

// ─── Hook ──────────────────────────────────

export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(loadState);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const saved = loadState();
    return saved ? computeRemaining(saved) : 0;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const saved = loadState();
    return saved ? computeElapsed(saved) : 0;
  });

  const workerRef = useRef<Worker | null>(null);
  const stateRef = useRef(timerState);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = timerState;
  }, [timerState]);

  // Persist to localStorage on every state change
  useEffect(() => {
    saveState(timerState);
  }, [timerState]);

  // ─── Tick handler ──────────────────────────

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.status === "idle" || s.status === "finished") return;

    const remaining = computeRemaining(s);
    const elapsed = computeElapsed(s);
    setRemainingSeconds(remaining);
    setElapsedSeconds(elapsed);

    if (s.status === "paused") return;

    if (remaining <= 0) {
      setTimerState((prev) => prev ? { ...prev, status: "finished" } : null);
      workerRef.current?.postMessage({ command: "stop" });
    }
  }, []);

  // ─── Web Worker setup ──────────────────────

  useEffect(() => {
    const worker = new TimerWorker();
    workerRef.current = worker;

    worker.onmessage = () => {
      tick();
    };

    // Start worker if we have an active timer
    const s = timerState;
    if (s && (s.status === "running" || s.status === "paused")) {
      worker.postMessage({ command: "start" });
      tick(); // immediate first tick
    }

    return () => {
      worker.postMessage({ command: "stop" });
      worker.terminate();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Stale session recovery ────────────────
  // On mount, verify localStorage state against server

  useEffect(() => {
    const saved = loadState();
    if (!saved || saved.status === "idle") return;

    // If timer already expired locally, mark finished immediately
    if (saved.status === "running" && computeRemaining(saved) <= 0) {
      setTimerState((prev) => prev ? { ...prev, status: "finished" } : null);
      return;
    }

    // Verify against server
    api
      .get<{ status: string; paused_total_seconds: number; paused_at: string | null }>(
        `/sessions/${saved.sessionId}`
      )
      .then((serverSession) => {
        // If server says it's already completed or canceled, clear local state
        if (
          serverSession.status === "completed_yes" ||
          serverSession.status === "completed_no" ||
          serverSession.status === "canceled"
        ) {
          setTimerState(null);
          setRemainingSeconds(0);
          setElapsedSeconds(0);
          workerRef.current?.postMessage({ command: "stop" });
          return;
        }

        // Sync paused_total_seconds from server (authoritative)
        setTimerState((prev) => {
          if (!prev) return null;
          const serverStatus = serverSession.status === "paused" ? "paused" : "running";
          return {
            ...prev,
            status: serverStatus as TimerStatus,
            pausedTotalSeconds: serverSession.paused_total_seconds,
            pausedAt: serverSession.paused_at,
          };
        });
      })
      .catch(() => {
        // If session not found on server, clear local state
        setTimerState(null);
        setRemainingSeconds(0);
        setElapsedSeconds(0);
      });
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cross-tab sync via storage event ─────
  // When another tab writes to localStorage, re-read the state.

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;

      // Re-read from localStorage — e.newValue is only set for cross-tab
      // native storage events. For manually-dispatched events (from
      // BroadcastChannel nudges), it's undefined.
      const raw = e.newValue ?? localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        // Timer cleared in another tab
        setTimerState(null);
        setRemainingSeconds(0);
        setElapsedSeconds(0);
        workerRef.current?.postMessage({ command: "stop" });
        return;
      }

      try {
        const incoming = JSON.parse(raw) as TimerState;
        setTimerState(incoming);
        setRemainingSeconds(computeRemaining(incoming));
        setElapsedSeconds(computeElapsed(incoming));

        // Start/stop worker based on incoming state
        if (incoming.status === "running" || incoming.status === "paused") {
          workerRef.current?.postMessage({ command: "start" });
        } else {
          workerRef.current?.postMessage({ command: "stop" });
        }
      } catch {
        // Ignore malformed data
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ─── visibilitychange: recalc on tab focus ─

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [tick]);

  // ─── Actions ───────────────────────────────

  const start = useCallback(async (params: StartParams) => {
    const data = await api.post<SessionResponse>("/sessions/start", {
      department_id: params.departmentId,
      project_id: params.projectId,
      duration_minutes: params.durationMinutes,
      planned_title: params.plannedTitle,
    });

    const newState: TimerState = {
      sessionId: data.id,
      departmentId: params.departmentId,
      departmentName: params.departmentName,
      projectId: params.projectId,
      projectCode: params.projectCode,
      projectName: params.projectName,
      plannedTitle: params.plannedTitle,
      durationMinutes: data.duration_minutes,
      startedAt: data.started_at,
      pausedAt: null,
      pausedTotalSeconds: 0,
      status: "running",
    };

    setTimerState(newState);
    setRemainingSeconds(params.durationMinutes * 60);
    setElapsedSeconds(0);
    workerRef.current?.postMessage({ command: "start" });
  }, []);

  const pause = useCallback(async () => {
    const s = stateRef.current;
    if (!s || s.status !== "running") return;

    await api.post(`/sessions/${s.sessionId}/pause`);

    const pausedAt = new Date().toISOString();
    setTimerState((prev) => prev ? { ...prev, status: "paused", pausedAt } : null);
  }, []);

  const resume = useCallback(async () => {
    const s = stateRef.current;
    if (!s || s.status !== "paused") return;

    const data = await api.post<{ paused_total_seconds: number }>(
      `/sessions/${s.sessionId}/resume`
    );

    setTimerState((prev) =>
      prev
        ? {
            ...prev,
            status: "running",
            pausedAt: null,
            pausedTotalSeconds: data.paused_total_seconds,
          }
        : null
    );
    workerRef.current?.postMessage({ command: "start" });
  }, []);

  const cancel = useCallback(async () => {
    const s = stateRef.current;
    if (!s) return;

    await api.post(`/sessions/${s.sessionId}/cancel`);

    workerRef.current?.postMessage({ command: "stop" });
    setTimerState(null);
    setRemainingSeconds(0);
    setElapsedSeconds(0);
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ command: "stop" });
    setTimerState(null);
    setRemainingSeconds(0);
    setElapsedSeconds(0);
  }, []);

  // ─── Derived values ────────────────────────

  const status: TimerStatus = timerState?.status ?? "idle";
  const progress = timerState
    ? 1 - remainingSeconds / (timerState.durationMinutes * 60)
    : 0;

  return {
    timerState,
    status,
    remainingSeconds,
    elapsedSeconds,
    progress,
    start,
    pause,
    resume,
    cancel,
    reset,
  };
}
