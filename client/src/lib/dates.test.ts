import { describe, it, expect } from "vitest";
import {
  toYMD,
  addDays,
  getWeekNumber,
  getWeekRange,
  getWeekStart,
  formatMinutes,
  formatFullDate,
  formatShortDate,
  formatDateRange,
} from "./dates";

// ─── toYMD ──────────────────────────────────

describe("toYMD", () => {
  it("formats a Date to YYYY-MM-DD in Asia/Taipei", () => {
    // Feb 2, 2026 midnight UTC+8
    const d = new Date("2026-02-02T00:00:00+08:00");
    expect(toYMD(d)).toBe("2026-02-02");
  });

  it("handles dates near midnight correctly", () => {
    // 11:59 PM Feb 2 in UTC+8 = still Feb 2 in Taipei
    const d = new Date("2026-02-02T23:59:00+08:00");
    expect(toYMD(d)).toBe("2026-02-02");
  });

  it("handles UTC midnight (which is 8 AM in Taipei)", () => {
    // Midnight UTC = 8 AM Taipei, still same day
    const d = new Date("2026-02-02T00:00:00Z");
    expect(toYMD(d)).toBe("2026-02-02");
  });
});

// ─── addDays ────────────────────────────────

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-02-02", 1)).toBe("2026-02-03");
    expect(addDays("2026-02-02", 7)).toBe("2026-02-09");
  });

  it("subtracts days with negative values", () => {
    expect(addDays("2026-02-02", -1)).toBe("2026-02-01");
    expect(addDays("2026-02-02", -2)).toBe("2026-01-31");
  });

  it("handles month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 is not a leap year
  });

  it("handles year boundary", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("adds zero days returns same date", () => {
    expect(addDays("2026-02-15", 0)).toBe("2026-02-15");
  });
});

// ─── getWeekNumber ──────────────────────────

describe("getWeekNumber", () => {
  it("returns 1 for Week 1 start date (Feb 2, 2026)", () => {
    expect(getWeekNumber("2026-02-02")).toBe(1);
  });

  it("returns 1 for Feb 8 (end of Week 1)", () => {
    expect(getWeekNumber("2026-02-08")).toBe(1);
  });

  it("returns 2 for Feb 9 (start of Week 2)", () => {
    expect(getWeekNumber("2026-02-09")).toBe(2);
  });

  it("returns 0 for dates before Week 1", () => {
    expect(getWeekNumber("2026-02-01")).toBe(0);
    expect(getWeekNumber("2026-01-15")).toBe(0);
    expect(getWeekNumber("2025-12-31")).toBe(0);
  });

  it("returns 3 for Week 3 (Feb 16-22)", () => {
    expect(getWeekNumber("2026-02-16")).toBe(3);
    expect(getWeekNumber("2026-02-22")).toBe(3);
  });

  it("handles large week numbers", () => {
    // 10 weeks after Week 1 start = Mar 13
    expect(getWeekNumber("2026-04-13")).toBe(11);
  });
});

// ─── getWeekRange ───────────────────────────

describe("getWeekRange", () => {
  it("returns correct range for Week 1", () => {
    const range = getWeekRange(1);
    expect(range.start).toBe("2026-02-02");
    expect(range.end).toBe("2026-02-08");
  });

  it("returns correct range for Week 2", () => {
    const range = getWeekRange(2);
    expect(range.start).toBe("2026-02-09");
    expect(range.end).toBe("2026-02-15");
  });

  it("returns correct range for Week 3", () => {
    const range = getWeekRange(3);
    expect(range.start).toBe("2026-02-16");
    expect(range.end).toBe("2026-02-22");
  });

  it("range spans exactly 7 days", () => {
    for (let w = 1; w <= 10; w++) {
      const range = getWeekRange(w);
      expect(addDays(range.start, 6)).toBe(range.end);
    }
  });
});

// ─── getWeekStart ───────────────────────────

describe("getWeekStart", () => {
  it("returns Monday for a Monday", () => {
    expect(getWeekStart("2026-02-02")).toBe("2026-02-02"); // Monday
  });

  it("returns Monday for a Wednesday", () => {
    expect(getWeekStart("2026-02-04")).toBe("2026-02-02");
  });

  it("returns Monday for a Sunday", () => {
    expect(getWeekStart("2026-02-08")).toBe("2026-02-02");
  });

  it("returns Monday for a Saturday", () => {
    expect(getWeekStart("2026-02-07")).toBe("2026-02-02");
  });

  it("works across month boundaries", () => {
    // Mar 1, 2026 is a Sunday
    expect(getWeekStart("2026-03-01")).toBe("2026-02-23");
  });
});

// ─── formatMinutes ──────────────────────────

describe("formatMinutes", () => {
  it("formats minutes only", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(30)).toBe("30m");
    expect(formatMinutes(59)).toBe("59m");
  });

  it("formats hours only", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(150)).toBe("2h 30m");
    expect(formatMinutes(61)).toBe("1h 1m");
  });
});

// ─── formatFullDate ─────────────────────────

describe("formatFullDate", () => {
  it("formats a date in full format", () => {
    const result = formatFullDate("2026-02-02");
    expect(result).toContain("Feb");
    expect(result).toContain("2");
    expect(result).toContain("2026");
  });
});

// ─── formatShortDate ────────────────────────

describe("formatShortDate", () => {
  it("formats a date in short format (no year)", () => {
    const result = formatShortDate("2026-02-02");
    expect(result).toContain("Feb");
    expect(result).toContain("2");
  });
});

// ─── formatDateRange ────────────────────────

describe("formatDateRange", () => {
  it("formats a range with short start and full end", () => {
    const result = formatDateRange("2026-02-02", "2026-02-08");
    expect(result).toContain("–");
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
  });
});
