import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeRemaining, computeElapsed, type TimerState } from "./useTimer";

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    sessionId: "test-id",
    departmentId: "dept-1",
    departmentName: "Dev",
    projectId: "proj-1",
    projectCode: null,
    projectName: "Project",
    plannedTitle: "Test",
    durationMinutes: 30,
    startedAt: "2026-02-15T10:00:00+08:00",
    pausedAt: null,
    pausedTotalSeconds: 0,
    status: "running",
    ...overrides,
  };
}

describe("computeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns full duration when just started", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    vi.setSystemTime(new Date(startedAt));

    const state = makeState({ startedAt, durationMinutes: 30 });
    expect(computeRemaining(state)).toBe(30 * 60); // 1800 seconds
  });

  it("decreases as time passes", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    // Now is 5 minutes after start
    vi.setSystemTime(new Date("2026-02-15T10:05:00+08:00"));

    const state = makeState({ startedAt, durationMinutes: 30 });
    expect(computeRemaining(state)).toBe(25 * 60); // 25 minutes left
  });

  it("returns 0 when time is up", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    // Now is 30 minutes after start
    vi.setSystemTime(new Date("2026-02-15T10:30:00+08:00"));

    const state = makeState({ startedAt, durationMinutes: 30 });
    expect(computeRemaining(state)).toBe(0);
  });

  it("returns 0 when past duration", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    // Now is 45 minutes after start
    vi.setSystemTime(new Date("2026-02-15T10:45:00+08:00"));

    const state = makeState({ startedAt, durationMinutes: 30 });
    expect(computeRemaining(state)).toBe(0);
  });

  it("accounts for paused total seconds", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    // 10 min elapsed, but 5 min paused → only 5 min real elapsed
    vi.setSystemTime(new Date("2026-02-15T10:10:00+08:00"));

    const state = makeState({
      startedAt,
      durationMinutes: 30,
      pausedTotalSeconds: 5 * 60, // 5 min paused
    });
    // 30 min - (10 min - 5 min) = 25 min remaining
    expect(computeRemaining(state)).toBe(25 * 60);
  });

  it("accounts for currently paused time", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    const pausedAt = "2026-02-15T10:05:00+08:00";
    // Now is 10 min after start, paused at 5 min mark (5 min paused so far)
    vi.setSystemTime(new Date("2026-02-15T10:10:00+08:00"));

    const state = makeState({
      startedAt,
      durationMinutes: 30,
      pausedAt,
      pausedTotalSeconds: 0,
      status: "paused",
    });
    // 30 min - (10 min elapsed - 0 prev paused - 5 min currently paused) = 25 min
    expect(computeRemaining(state)).toBe(25 * 60);
  });

  it("works with 60-minute duration", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    vi.setSystemTime(new Date("2026-02-15T10:30:00+08:00"));

    const state = makeState({ startedAt, durationMinutes: 60 });
    expect(computeRemaining(state)).toBe(30 * 60); // 30 minutes left
  });
});

describe("computeElapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when just started", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    vi.setSystemTime(new Date(startedAt));

    const state = makeState({ startedAt });
    expect(computeElapsed(state)).toBe(0);
  });

  it("returns elapsed time excluding paused time", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    // 10 min elapsed, 3 min paused
    vi.setSystemTime(new Date("2026-02-15T10:10:00+08:00"));

    const state = makeState({
      startedAt,
      pausedTotalSeconds: 3 * 60,
    });
    expect(computeElapsed(state)).toBe(7 * 60); // 7 min active
  });

  it("accounts for currently paused time", () => {
    const startedAt = "2026-02-15T10:00:00+08:00";
    const pausedAt = "2026-02-15T10:08:00+08:00";
    // Now 10 min, paused at 8 min (2 min paused)
    vi.setSystemTime(new Date("2026-02-15T10:10:00+08:00"));

    const state = makeState({
      startedAt,
      pausedAt,
      pausedTotalSeconds: 0,
      status: "paused",
    });
    // 10 min wall - 2 min paused = 8 min active
    expect(computeElapsed(state)).toBe(8 * 60);
  });

  it("never returns negative", () => {
    const startedAt = "2026-02-15T10:10:00+08:00";
    // Now is before startedAt (shouldn't happen but testing edge case)
    vi.setSystemTime(new Date("2026-02-15T10:00:00+08:00"));

    const state = makeState({ startedAt });
    expect(computeElapsed(state)).toBe(0);
  });
});
