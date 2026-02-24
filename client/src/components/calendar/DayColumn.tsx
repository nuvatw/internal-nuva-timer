import { memo, useEffect, useState } from "react";
import { positionEvents } from "../../lib/calendar";
import EventBlock from "./EventBlock";
import type { Session } from "../../types/models";

interface DayColumnProps {
  date: string; // YYYY-MM-DD
  sessions: Session[];
  hourHeight?: number;
  showHourLabels?: boolean;
  isToday?: boolean;
  onSelectSession: (sessionId: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default memo(function DayColumn({
  date,
  sessions,
  hourHeight = 56,
  showHourLabels = false,
  isToday = false,
  onSelectSession,
}: DayColumnProps) {
  const events = positionEvents(sessions, date);
  const totalHeight = 24 * hourHeight;

  // Current time indicator (updates every minute)
  const [nowMinute, setNowMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const now = new Date();
      setNowMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  return (
    <div className="flex min-w-0 flex-1">
      {/* Hour labels (optional, shown once on the left in WeekView) */}
      {showHourLabels && (
        <div className="w-12 shrink-0 relative" style={{ height: totalHeight }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-text-tertiary font-mono tabular-nums -translate-y-1/2"
              style={{ top: h * hourHeight }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
      )}

      {/* Column grid + events */}
      <div className="relative flex-1 border-l border-border" style={{ height: totalHeight }}>
        {/* Hour grid lines */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-border-subtle"
            style={{ top: h * hourHeight }}
          />
        ))}

        {/* Current time indicator */}
        {isToday && (
          <div
            className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
            style={{ top: (nowMinute / 60) * hourHeight }}
          >
            <div className="h-2 w-2 rounded-full bg-destructive -ml-1 shrink-0" />
            <div className="flex-1 h-[1.5px] bg-destructive" />
          </div>
        )}

        {/* Event blocks */}
        <div className="absolute inset-0 mx-1">
          {events.map((ev) => (
            <EventBlock
              key={ev.session.id}
              event={ev}
              hourHeight={hourHeight}
              onClick={onSelectSession}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
