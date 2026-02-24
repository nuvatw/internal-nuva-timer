import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { addDays, todayYMD } from "../../lib/dates";
import DayColumn from "./DayColumn";
import type { Session } from "../../types/models";

interface WeekViewProps {
  /** Monday of the week (YYYY-MM-DD) */
  weekStart: string;
  sessions: Session[];
  hourHeight?: number;
  onSelectSession: (sessionId: string) => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default memo(function WeekView({
  weekStart,
  sessions,
  hourHeight = 56,
  onSelectSession,
}: WeekViewProps) {
  const today = todayYMD();

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayNum: date.split("-")[2],
        label: DAY_LABELS[i],
        isToday: date === today,
      };
    });
  }, [weekStart, today]);

  // Group sessions by date (a session can span multiple days)
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const d of days) {
      map.set(d.date, []);
    }
    for (const s of sessions) {
      // Place each session on every day it overlaps
      for (const d of days) {
        const startDate = s.started_at.slice(0, 10);
        const endIso = s.ended_at ?? s.canceled_at;
        const endDate = endIso ? endIso.slice(0, 10) : today;

        if (d.date >= startDate && d.date <= endDate) {
          map.get(d.date)!.push(s);
        }
      }
    }
    return map;
  }, [sessions, days, today]);

  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Day headers */}
      <div className="flex sticky top-0 z-10 bg-bg border-b border-border">
        {/* Spacer for hour labels */}
        <div className="w-12 shrink-0" />

        {days.map((d) => (
          <div
            key={d.date}
            className={`flex-1 text-center py-2 border-l border-border ${
              d.isToday ? "bg-accent-muted/30" : ""
            }`}
          >
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider">
              {d.label}
            </p>
            <p
              className={`text-sm font-semibold tabular-nums mt-0.5 ${
                d.isToday
                  ? "text-accent"
                  : "text-text-primary"
              }`}
            >
              {d.dayNum}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto">
        {/* Shared hour labels on the far left */}
        <div className="w-12 shrink-0 relative" style={{ height: 24 * hourHeight }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-text-tertiary font-mono tabular-nums -translate-y-1/2"
              style={{ top: h * hourHeight }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((d) => (
          <DayColumn
            key={d.date}
            date={d.date}
            sessions={sessionsByDate.get(d.date) ?? []}
            hourHeight={hourHeight}
            showHourLabels={false}
            isToday={d.isToday}
            onSelectSession={onSelectSession}
          />
        ))}
      </div>
    </motion.div>
  );
});
