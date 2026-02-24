import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  levelFromXp,
  getLevelTitle,
  getCurrentMultiplier,
  calculateXpGain,
  calculateNewTomatoes,
} from "./game.js";

// ─── xpForLevel ──────────────────────────────

describe("xpForLevel", () => {
  it("level 1 requires 10 XP", () => {
    expect(xpForLevel(1)).toBe(10);
  });

  it("level 2 requires 40 XP", () => {
    expect(xpForLevel(2)).toBe(40);
  });

  it("level 10 requires 1000 XP", () => {
    expect(xpForLevel(10)).toBe(1000);
  });

  it("level 0 requires 0 XP", () => {
    expect(xpForLevel(0)).toBe(0);
  });
});

// ─── levelFromXp ─────────────────────────────

describe("levelFromXp", () => {
  it("returns 0 for 0 XP", () => {
    expect(levelFromXp(0)).toBe(0);
  });

  it("returns 0 for 9 XP (below level 1 threshold)", () => {
    expect(levelFromXp(9)).toBe(0);
  });

  it("returns 1 at exactly 10 XP", () => {
    expect(levelFromXp(10)).toBe(1);
  });

  it("returns 1 at 39 XP (just below level 2)", () => {
    expect(levelFromXp(39)).toBe(1);
  });

  it("returns 2 at exactly 40 XP", () => {
    expect(levelFromXp(40)).toBe(2);
  });

  it("returns 10 at exactly 1000 XP", () => {
    expect(levelFromXp(1000)).toBe(10);
  });

  it("is consistent with xpForLevel", () => {
    for (let level = 0; level <= 50; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
    }
  });
});

// ─── getLevelTitle ────────────────────────────

describe("getLevelTitle", () => {
  it.each([
    [1, "Seedling"],
    [5, "Seedling"],
    [6, "Sprout"],
    [10, "Sprout"],
    [11, "Sapling"],
    [15, "Sapling"],
    [16, "Tree"],
    [20, "Tree"],
    [21, "Grove"],
    [30, "Grove"],
    [31, "Forest"],
    [40, "Forest"],
    [41, "Ancient Forest"],
    [50, "Ancient Forest"],
    [51, "Mythic"],
    [99, "Mythic"],
  ])("level %i → %s", (level, expected) => {
    expect(getLevelTitle(level)).toBe(expected);
  });
});

// ─── getCurrentMultiplier ────────────────────

describe("getCurrentMultiplier", () => {
  it("returns 1x at 0 daily minutes", () => {
    expect(getCurrentMultiplier(0)).toBe(1);
  });

  it("returns 1x at 59 daily minutes", () => {
    expect(getCurrentMultiplier(59)).toBe(1);
  });

  it("returns 2x at exactly 60 daily minutes", () => {
    expect(getCurrentMultiplier(60)).toBe(2);
  });

  it("returns 3x at 120 daily minutes", () => {
    expect(getCurrentMultiplier(120)).toBe(3);
  });

  it("caps at 5x for 240+ daily minutes", () => {
    expect(getCurrentMultiplier(240)).toBe(5);
  });

  it("caps at 5x for 600 daily minutes", () => {
    expect(getCurrentMultiplier(600)).toBe(5);
  });
});

// ─── calculateXpGain ─────────────────────────

describe("calculateXpGain", () => {
  it("returns 0 for 0-minute session", () => {
    expect(calculateXpGain(0, 0)).toBe(0);
  });

  it("returns 0 for negative duration", () => {
    expect(calculateXpGain(-10, 0)).toBe(0);
  });

  it("returns 0 for less than 10 minutes (no full block)", () => {
    expect(calculateXpGain(9, 0)).toBe(0);
  });

  it("returns 1 XP for 10 minutes at 1x multiplier", () => {
    // 1 block × 1x = 1
    expect(calculateXpGain(10, 0)).toBe(1);
  });

  it("returns 3 XP for 30-min session starting at 0 daily min", () => {
    // 3 blocks, all at 1x multiplier (0, 10, 20 daily min → all < 60)
    expect(calculateXpGain(30, 0)).toBe(3);
  });

  it("applies 2x multiplier when crossing 60 daily minutes", () => {
    // 30 min session, starting at 50 daily min
    // Block 0: 50 min → 1x → +1
    // Block 1: 60 min → 2x → +2
    // Block 2: 70 min → 2x → +2
    expect(calculateXpGain(30, 50)).toBe(5);
  });

  it("returns 6 XP for 60-min session at 0 daily min", () => {
    // 6 blocks: 0,10,20,30,40,50 → all at 1x = 6
    expect(calculateXpGain(60, 0)).toBe(6);
  });

  it("applies multiplier escalation across hours", () => {
    // 30 min session starting at 110 daily min
    // Block 0: 110 min → floor(110/60)+1 = 2x → +2
    // Block 1: 120 min → floor(120/60)+1 = 3x → +3
    // Block 2: 130 min → floor(130/60)+1 = 3x → +3
    expect(calculateXpGain(30, 110)).toBe(8);
  });

  it("ignores partial blocks (e.g. 25 min = 2 blocks)", () => {
    expect(calculateXpGain(25, 0)).toBe(2);
  });

  it("respects 5x cap", () => {
    // 10 min session at 300 daily min → floor(300/60)+1 = 6 → capped at 5
    expect(calculateXpGain(10, 300)).toBe(5);
  });
});

// ─── calculateNewTomatoes ────────────────────

describe("calculateNewTomatoes", () => {
  it("returns 0 for 0-minute session", () => {
    expect(calculateNewTomatoes(0, 0)).toBe(0);
  });

  it("returns 0 when not crossing a 30-min boundary", () => {
    // 10 min at 0 daily: before=0 tomatoes, after=floor(10/30)=0
    expect(calculateNewTomatoes(10, 0)).toBe(0);
  });

  it("returns 1 when crossing first 30-min boundary", () => {
    // 30 min at 0 daily: before=0, after=floor(30/30)=1
    expect(calculateNewTomatoes(30, 0)).toBe(1);
  });

  it("returns 1 when session crosses a boundary mid-way", () => {
    // 10 min at 25 daily: before=floor(25/30)=0, after=floor(35/30)=1
    expect(calculateNewTomatoes(10, 25)).toBe(1);
  });

  it("returns 2 for a 60-min session from 0", () => {
    // before=0, after=floor(60/30)=2
    expect(calculateNewTomatoes(60, 0)).toBe(2);
  });

  it("returns 0 when staying within same 30-min bucket", () => {
    // 10 min at 31 daily: before=floor(31/30)=1, after=floor(41/30)=1
    expect(calculateNewTomatoes(10, 31)).toBe(0);
  });
});
