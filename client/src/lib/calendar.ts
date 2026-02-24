/**
 * Calendar utilities for positioning session events on a time grid.
 * All times use Asia/Taipei timezone (UTC+8).
 */

import { TZ, toYMD, addDays } from "./dates";
import type { Session } from "../types/models";

// ─── Types ───────────────────────────────────

export interface CalendarEvent {
  session: Session;
  /** Minutes from midnight (0–1440) in the column's date */
  startMinute: number;
  /** Minutes from midnight (0–1440) */
  endMinute: number;
  /** Column index for overlapping events (0-based) */
  column: number;
  /** Total columns sharing this time slot */
  totalColumns: number;
}

export interface MonthCell {
  date: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: Session[];
  totalMinutes: number;
}

// ─── Time Extraction ─────────────────────────

/** Get minute-of-day (0–1439) for an ISO timestamp in Asia/Taipei. */
function minuteOfDay(iso: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(d);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Get date string (YYYY-MM-DD) for an ISO timestamp in Asia/Taipei. */
function dateOfIso(iso: string): string {
  return toYMD(new Date(iso));
}

// ─── Event Positioning ───────────────────────

/**
 * Position sessions for a single day column.
 * Handles overlap detection and column assignment.
 */
export function positionEvents(
  sessions: Session[],
  dateYMD: string,
): CalendarEvent[] {
  // Filter sessions that overlap this date
  const dayEvents: { session: Session; startMin: number; endMin: number }[] = [];

  for (const s of sessions) {
    const sessionDate = dateOfIso(s.started_at);

    // Determine end time
    const endIso = s.ended_at ?? s.canceled_at;
    let startMin: number;
    let endMin: number;

    if (sessionDate === dateYMD) {
      startMin = minuteOfDay(s.started_at);
    } else if (sessionDate < dateYMD) {
      // Session started on a previous day, clip to midnight
      startMin = 0;
    } else {
      continue; // Session starts after this day
    }

    if (endIso) {
      const endDate = dateOfIso(endIso);
      if (endDate === dateYMD) {
        endMin = minuteOfDay(endIso);
      } else if (endDate > dateYMD) {
        endMin = 1440; // Clip to end of day
      } else {
        continue; // Session ended before this day
      }
    } else {
      // Running session — show until current time or end of day
      const nowDate = toYMD(new Date());
      if (nowDate === dateYMD) {
        endMin = minuteOfDay(new Date().toISOString());
      } else {
        endMin = 1440;
      }
    }

    // Minimum display height: 15 minutes
    if (endMin - startMin < 15) endMin = Math.min(startMin + 15, 1440);

    dayEvents.push({ session: s, startMin, endMin });
  }

  // Sort by start time, then by duration (longer first)
  dayEvents.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  // Greedy overlap detection: assign columns
  const events: CalendarEvent[] = [];
  const groups: { startMin: number; endMin: number; members: number[] }[] = [];

  for (let i = 0; i < dayEvents.length; i++) {
    const ev = dayEvents[i];
    // Find which existing columns this event overlaps with
    let placed = false;

    for (const group of groups) {
      if (ev.startMin < group.endMin) {
        // Overlaps with this group
        group.endMin = Math.max(group.endMin, ev.endMin);
        group.members.push(i);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({
        startMin: ev.startMin,
        endMin: ev.endMin,
        members: [i],
      });
    }
  }

  // Assign column indices within each group
  for (const group of groups) {
    const totalColumns = group.members.length;
    const columnEnds: number[] = []; // Track when each column is free

    for (const idx of group.members) {
      const ev = dayEvents[idx];
      // Find the first column where this event fits
      let col = 0;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= ev.startMin) {
          col = c;
          break;
        }
        col = c + 1;
      }
      if (col >= columnEnds.length) columnEnds.push(0);
      columnEnds[col] = ev.endMin;

      events.push({
        session: ev.session,
        startMinute: ev.startMin,
        endMinute: ev.endMin,
        column: col,
        totalColumns: Math.max(totalColumns, columnEnds.length),
      });
    }

    // Fix totalColumns to reflect actual columns used
    const actualCols = Math.max(...events.filter((e) =>
      group.members.includes(dayEvents.findIndex((d) => d.session.id === e.session.id))
    ).map((e) => e.column + 1), 1);

    for (const idx of group.members) {
      const ev = events.find((e) => e.session.id === dayEvents[idx].session.id);
      if (ev) ev.totalColumns = actualCols;
    }
  }

  return events;
}

// ─── Month Grid ──────────────────────────────

/**
 * Generate a 6×7 month grid for a given year/month.
 * Weeks start on Monday.
 */
export function generateMonthGrid(
  year: number,
  month: number, // 1-12
  sessions: Session[],
  todayStr: string,
): MonthCell[] {
  const cells: MonthCell[] = [];

  // First day of the month
  const firstDay = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`);
  const firstDayYMD = toYMD(firstDay);

  // Day-of-week for the 1st (0=Sun, need Mon=0)
  const dow = firstDay.getUTCDay(); // This is UTC, need to adjust
  const mondayOffset = (dow === 0 ? 6 : dow - 1); // Mon=0, Tue=1, ..., Sun=6

  // Start of grid (may be in previous month)
  const gridStart = addDays(firstDayYMD, -mondayOffset);

  // Group sessions by date
  const sessionsByDate = new Map<string, Session[]>();
  for (const s of sessions) {
    const d = dateOfIso(s.started_at);
    const arr = sessionsByDate.get(d) ?? [];
    arr.push(s);
    sessionsByDate.set(d, arr);
  }

  // Generate 42 cells (6 weeks × 7 days)
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    const dateParts = date.split("-");
    const cellMonth = Number(dateParts[1]);
    const daySessions = sessionsByDate.get(date) ?? [];

    const totalMinutes = daySessions.reduce((sum, s) => {
      if (s.status === "canceled") return sum;
      return sum + s.duration_minutes;
    }, 0);

    cells.push({
      date,
      isCurrentMonth: cellMonth === month,
      isToday: date === todayStr,
      sessions: daySessions,
      totalMinutes,
    });
  }

  return cells;
}

// ─── Department Colors ───────────────────────

const DEPT_PALETTE = [
  { bg: "bg-indigo-500/15", border: "border-l-indigo-500", text: "text-indigo-300" },
  { bg: "bg-emerald-500/15", border: "border-l-emerald-500", text: "text-emerald-300" },
  { bg: "bg-amber-500/15", border: "border-l-amber-500", text: "text-amber-300" },
  { bg: "bg-rose-500/15", border: "border-l-rose-500", text: "text-rose-300" },
  { bg: "bg-cyan-500/15", border: "border-l-cyan-500", text: "text-cyan-300" },
  { bg: "bg-violet-500/15", border: "border-l-violet-500", text: "text-violet-300" },
  { bg: "bg-orange-500/15", border: "border-l-orange-500", text: "text-orange-300" },
  { bg: "bg-teal-500/15", border: "border-l-teal-500", text: "text-teal-300" },
];

const deptColorCache = new Map<string, (typeof DEPT_PALETTE)[0]>();

/** Get consistent color for a department (stable across renders). */
export function getDeptColor(deptName: string) {
  const cached = deptColorCache.get(deptName);
  if (cached) return cached;
  const idx = deptColorCache.size % DEPT_PALETTE.length;
  const color = DEPT_PALETTE[idx];
  deptColorCache.set(deptName, color);
  return color;
}
