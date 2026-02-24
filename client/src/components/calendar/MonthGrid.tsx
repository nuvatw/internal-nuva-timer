import { memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { generateMonthGrid, getDeptColor, type MonthCell } from "../../lib/calendar";
import { todayYMD, formatMinutes } from "../../lib/dates";
import type { Session } from "../../types/models";

interface MonthGridProps {
  year: number;
  month: number; // 1-12
  sessions: Session[];
  onSelectDate: (date: string) => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DayCell = memo(function DayCell({
  cell,
  onSelect,
}: {
  cell: MonthCell;
  onSelect: () => void;
}) {
  const dayNum = Number(cell.date.split("-")[2]);
  const maxPills = 3;
  const displaySessions = cell.sessions.slice(0, maxPills);
  const overflow = cell.sessions.length - maxPills;

  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col items-stretch p-1.5 min-h-[80px] border-b border-r border-border-subtle text-left transition-colors hover:bg-surface-raised/50 ${
        !cell.isCurrentMonth ? "opacity-40" : ""
      } ${cell.isToday ? "bg-accent-muted/20" : ""}`}
    >
      <span
        className={`text-xs font-medium tabular-nums self-end ${
          cell.isToday
            ? "h-5 w-5 flex items-center justify-center rounded-full bg-accent text-white"
            : "text-text-secondary"
        }`}
      >
        {dayNum}
      </span>

      {/* Session pills */}
      <div className="mt-1 space-y-0.5 flex-1">
        {displaySessions.map((s) => {
          const color = getDeptColor(s.departments.name);
          return (
            <div
              key={s.id}
              className={`truncate text-[9px] leading-tight px-1 py-0.5 rounded ${color.bg} ${color.text}`}
            >
              {s.planned_title}
            </div>
          );
        })}
        {overflow > 0 && (
          <p className="text-[9px] text-text-tertiary pl-1">
            +{overflow} more
          </p>
        )}
      </div>

      {/* Total minutes badge */}
      {cell.totalMinutes > 0 && (
        <span className="text-[9px] text-text-tertiary font-mono tabular-nums self-end mt-0.5">
          {formatMinutes(cell.totalMinutes)}
        </span>
      )}
    </button>
  );
});

export default memo(function MonthGrid({
  year,
  month,
  sessions,
  onSelectDate,
}: MonthGridProps) {
  const today = todayYMD();
  const cells = useMemo(
    () => generateMonthGrid(year, month, sessions, today),
    [year, month, sessions, today],
  );

  // Stable per-cell callbacks to avoid DayCell re-renders
  const handleSelectDate = useCallback(
    (date: string) => onSelectDate(date),
    [onSelectDate],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] text-text-tertiary uppercase tracking-wider py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 6-row grid */}
      <div className="grid grid-cols-7 border-l border-t border-border-subtle">
        {cells.map((cell) => (
          <DayCell
            key={cell.date}
            cell={cell}
            onSelect={() => handleSelectDate(cell.date)}
          />
        ))}
      </div>
    </motion.div>
  );
});
