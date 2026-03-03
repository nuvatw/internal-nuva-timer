import { memo } from "react";
import { motion } from "framer-motion";
import { formatTime, plannedEndIso } from "../../lib/dates";
import { getDeptColor, type CalendarEvent } from "../../lib/calendar";

interface EventBlockProps {
  event: CalendarEvent;
  hourHeight: number;
  onClick: (sessionId: string) => void;
}

export default memo(function EventBlock({ event, hourHeight, onClick }: EventBlockProps) {
  const { session, startMinute, endMinute, column, totalColumns } = event;
  const deptColor = getDeptColor(session.departments.name);

  const top = (startMinute / 60) * hourHeight;
  const height = Math.max(((endMinute - startMinute) / 60) * hourHeight, 24);
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  const isShort = endMinute - startMinute < 30;
  const isActive = session.status === "running" || session.status === "paused";
  const endDisplay = isActive ? "now" : formatTime(plannedEndIso(session.started_at, session.duration_minutes));

  return (
    <motion.button
      className={`absolute rounded-md border-l-[3px] ${deptColor.border} ${deptColor.bg} px-1.5 py-1 text-left overflow-hidden cursor-pointer transition-all group hover:brightness-110 hover:shadow-md hover:-translate-y-px`}
      style={{
        top,
        height,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 2px)`,
      }}
      onClick={() => onClick(session.id)}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      title={`${session.planned_title}\n${formatTime(session.started_at)} – ${endDisplay}`}
    >
      {isShort ? (
        <p className="text-[10px] text-text-secondary truncate leading-tight">
          {session.planned_title}
        </p>
      ) : (
        <>
          <p className="text-[11px] font-medium text-text-primary truncate leading-tight">
            {session.planned_title}
          </p>
          <p className="text-[10px] text-text-tertiary font-mono tabular-nums mt-0.5">
            {formatTime(session.started_at)} – {endDisplay}
          </p>
          {height > 56 && (
            <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
              {session.projects.code ?? session.projects.name}
            </p>
          )}
        </>
      )}
    </motion.button>
  );
});
