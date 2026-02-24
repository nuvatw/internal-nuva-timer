import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronRight, CalendarDays, SearchX } from "lucide-react";
import { formatTimeRange } from "../../lib/dates";
import { listVariants, listItemVariants } from "../../lib/motion";
import { statusLabel } from "./constants";
import EmptyState from "../EmptyState";
import type { Session } from "../../types/models";

// ─── Session Card ──────────────────────────

const SessionCard = memo(function SessionCard({
  session,
  onSelect,
}: {
  session: Session;
  onSelect: (session: Session) => void;
}) {
  const st = statusLabel(session.status);
  const displayTitle =
    session.status === "completed_no" && session.actual_title
      ? session.actual_title
      : session.planned_title;

  return (
    <button
      onClick={() => onSelect(session)}
      className="w-full text-left rounded-lg border border-border bg-bg p-3 hover:bg-surface transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span className="font-mono tabular-nums">
              {formatTimeRange(session.started_at, session.ended_at, session.canceled_at)}
            </span>
            <span>&middot;</span>
            <span>
              {session.departments.name} / {session.projects.code ?? session.projects.name}
            </span>
            <span>&middot;</span>
            <span>{session.duration_minutes}m</span>
          </div>
          <p className="mt-1 text-sm text-text-primary font-medium truncate" title={displayTitle}>
            {displayTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
            {st.text}
          </span>
          <ChevronRight
            size={14}
            strokeWidth={2}
            className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      {session.status === "completed_no" && session.actual_title && (
        <p className="mt-1 text-xs text-warning truncate">
          Planned: &ldquo;{session.planned_title}&rdquo;
        </p>
      )}

      {session.notes && (
        <p className="mt-1 text-xs text-text-tertiary truncate" title={session.notes}>
          {session.notes}
        </p>
      )}
    </button>
  );
});

// ─── Session List ──────────────────────────

export default function SessionList({
  sessions,
  hasFilters,
  onClearFilters,
  onSelectSession,
}: {
  sessions: Session[];
  hasFilters: boolean;
  onClearFilters: () => void;
  onSelectSession: (session: Session) => void;
}) {
  if (sessions.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No matching sessions"
        description="Try adjusting your filters or date range to find what you're looking for."
        action={{ label: "Clear Filters", onClick: onClearFilters }}
      />
    ) : (
      <EmptyState
        icon={CalendarDays}
        title="No sessions yet"
        description="Complete your first focus session and it will show up here. Head to the timer to get started."
      />
    );
  }

  return (
    <motion.div
      className="space-y-2"
      variants={listVariants}
      initial="initial"
      animate="animate"
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Sessions</h3>
      {sessions.map((s) => (
        <motion.div key={s.id} variants={listItemVariants}>
          <SessionCard session={s} onSelect={onSelectSession} />
        </motion.div>
      ))}
    </motion.div>
  );
}
