/**
 * Date utilities for nuva Focus Timer.
 * All dates use Asia/Taipei timezone (UTC+8).
 * Week 1 = 2026-02-02 (Monday). Weeks run Mon–Sun.
 */

const TZ = "Asia/Taipei";
const WEEK1_START = new Date("2026-02-02T00:00:00+08:00"); // Monday Feb 2, 2026

// ─── Helpers ───────────────────────────────

/** Get a Date shifted to Asia/Taipei local midnight for a YYYY-MM-DD string. */
function dateFromYMD(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+08:00`);
}

/** Format a Date to YYYY-MM-DD in Asia/Taipei. */
export function toYMD(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** Get "today" in Asia/Taipei as YYYY-MM-DD. */
export function todayYMD(): string {
  return toYMD(new Date());
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(ymd: string, days: number): string {
  const d = dateFromYMD(ymd);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

/** Get day-of-week in Asia/Taipei (0=Sun .. 6=Sat). */
function dayOfWeek(ymd: string): number {
  const d = dateFromYMD(ymd);
  // Shift to UTC midnight matching the Taipei date (midnight +08:00 → add 8h to get correct UTC day)
  const utcDate = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return utcDate.getUTCDay();
}

// ─── Week Number ───────────────────────────

/**
 * Get the ISO-style week number anchored at Week 1 = Feb 2, 2026 (Monday).
 * Returns 0 for dates before Week 1.
 */
export function getWeekNumber(ymd: string): number {
  const d = dateFromYMD(ymd);
  const diffMs = d.getTime() - WEEK1_START.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Get the date range { start, end } (YYYY-MM-DD) for a given week number.
 * Week 1 = Feb 2–8, 2026.
 */
export function getWeekRange(weekNum: number): { start: string; end: string } {
  const startMs = WEEK1_START.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000;
  const start = toYMD(new Date(startMs));
  const end = addDays(start, 6);
  return { start, end };
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getWeekStart(ymd: string): string {
  const dow = dayOfWeek(ymd);
  // Monday = 1, so offset = (dow + 6) % 7 days back
  const offset = (dow + 6) % 7;
  return addDays(ymd, -offset);
}

// ─── Day Range ─────────────────────────────

export function getDayRange(ymd: string): { start: string; end: string } {
  return { start: ymd, end: ymd };
}

// ─── Current Week ──────────────────────────

export function getCurrentWeekNumber(): number {
  return getWeekNumber(todayYMD());
}

// ─── Formatting ────────────────────────────

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
});

const fullDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Format "Feb 2" style. */
export function formatShortDate(ymd: string): string {
  return monthDayFmt.format(dateFromYMD(ymd));
}

/** Format "Feb 2, 2026" style. */
export function formatFullDate(ymd: string): string {
  return fullDateFmt.format(dateFromYMD(ymd));
}

/** Format a date range like "Feb 2 – Feb 8, 2026". */
export function formatDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} – ${formatFullDate(end)}`;
}

/** Format an ISO timestamp to "HH:mm" in Asia/Taipei. */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** Format minutes to "Xh Ym" display. */
export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
