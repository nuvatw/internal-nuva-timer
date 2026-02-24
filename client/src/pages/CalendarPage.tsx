import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarX2, Timer } from "lucide-react";
import { api } from "../lib/api";
import { getDeptColor } from "../lib/calendar";
import {
  todayYMD,
  addDays,
  getWeekStart,
  formatShortDate,
  formatFullDate,
} from "../lib/dates";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useHotkeys } from "../hooks/useHotkeys";
import CalendarHeader from "../components/calendar/CalendarHeader";
import WeekView from "../components/calendar/WeekView";
import MonthGrid from "../components/calendar/MonthGrid";
import EmptyState from "../components/EmptyState";
import { CalendarWeekSkeleton, CalendarMonthSkeleton } from "../components/Skeleton";
import SessionDetailPanel from "../components/SessionDetailPanel";
import ManualEntryModal from "../components/calendar/ManualEntryModal";
import type { Session } from "../types/models";

type CalendarView = "week" | "month";

// ─── Month Helpers ────────────────────────

function monthTitle(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// ─── Department Legend ────────────────────

function DeptLegend({ sessions }: { sessions: Session[] }) {
  const departments = useMemo(() => {
    const names = new Set(sessions.map((s) => s.departments.name));
    return Array.from(names);
  }, [sessions]);

  if (departments.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {departments.map((name) => {
        const color = getDeptColor(name);
        return (
          <div key={name} className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${color.border.replace("border-l-", "bg-")}`} />
            <span className="text-[11px] text-text-secondary">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar Page ────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = todayYMD();
  const todayParts = today.split("-").map(Number);

  const [view, setView] = useState<CalendarView>("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [monthYear, setMonthYear] = useState(todayParts[0]);
  const [monthNum, setMonthNum] = useState(todayParts[1]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Debounce navigation to prevent rapid re-fetches
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Date Range for Fetching ─────────

  const dateRange = useMemo(() => {
    if (view === "week") {
      return { start: weekStart, end: addDays(weekStart, 6) };
    }
    const firstDay = new Date(`${monthYear}-${String(monthNum).padStart(2, "0")}-01T00:00:00+08:00`);
    const dow = firstDay.getUTCDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const gridStart = addDays(`${monthYear}-${String(monthNum).padStart(2, "0")}-01`, -mondayOffset);
    const gridEnd = addDays(gridStart, 41);
    return { start: gridStart, end: gridEnd };
  }, [view, weekStart, monthYear, monthNum]);

  // ─── Title ────────────────────────────

  const title = useMemo(() => {
    if (view === "week") {
      const end = addDays(weekStart, 6);
      return `${formatShortDate(weekStart)} – ${formatFullDate(end)}`;
    }
    return monthTitle(monthYear, monthNum);
  }, [view, weekStart, monthYear, monthNum]);

  useDocumentTitle(`Calendar — ${title}`);

  // ─── Navigation (debounced) ──────────

  const debouncedNav = useCallback((fn: () => void) => {
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(fn, 100);
  }, []);

  const handlePrev = useCallback(() => {
    debouncedNav(() => {
      if (view === "week") {
        setWeekStart((ws) => addDays(ws, -7));
      } else {
        const p = prevMonth(monthYear, monthNum);
        setMonthYear(p.year);
        setMonthNum(p.month);
      }
    });
  }, [view, monthYear, monthNum, debouncedNav]);

  const handleNext = useCallback(() => {
    debouncedNav(() => {
      if (view === "week") {
        setWeekStart((ws) => addDays(ws, 7));
      } else {
        const n = nextMonth(monthYear, monthNum);
        setMonthYear(n.year);
        setMonthNum(n.month);
      }
    });
  }, [view, monthYear, monthNum, debouncedNav]);

  const handleToday = useCallback(() => {
    const t = todayYMD();
    setWeekStart(getWeekStart(t));
    const parts = t.split("-").map(Number);
    setMonthYear(parts[0]);
    setMonthNum(parts[1]);
  }, []);

  const handleViewChange = useCallback(
    (v: CalendarView) => {
      setView(v);
      if (v === "month") {
        const parts = weekStart.split("-").map(Number);
        setMonthYear(parts[0]);
        setMonthNum(parts[1]);
      } else {
        const ymd = `${monthYear}-${String(monthNum).padStart(2, "0")}-01`;
        setWeekStart(getWeekStart(ymd));
      }
    },
    [weekStart, monthYear, monthNum],
  );

  const handleSelectDate = useCallback((date: string) => {
    setWeekStart(getWeekStart(date));
    setView("week");
  }, []);

  // ─── Data Fetching ────────────────────

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      }).toString();
      const data = await api.get<Session[]>(`/sessions?${qs}`);
      setSessions(data);
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // Keep selectedSession in sync after re-fetch
  useEffect(() => {
    if (selectedSession) {
      const updated = sessions.find((s) => s.id === selectedSession.id);
      if (updated) setSelectedSession(updated);
    }
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const s = sessions.find((sess) => sess.id === sessionId) ?? null;
      setSelectedSession(s);
    },
    [sessions],
  );

  // ─── Keyboard Navigation ─────────────

  useHotkeys("ArrowLeft", useCallback(() => {
    if (selectedSession) return; // Don't navigate while panel is open
    handlePrev();
  }, [handlePrev, selectedSession]));

  useHotkeys("ArrowRight", useCallback(() => {
    if (selectedSession) return;
    handleNext();
  }, [handleNext, selectedSession]));

  useHotkeys("t", useCallback(() => {
    handleToday();
  }, [handleToday]));

  useHotkeys("w", useCallback(() => {
    handleViewChange("week");
  }, [handleViewChange]));

  useHotkeys("m", useCallback(() => {
    handleViewChange("month");
  }, [handleViewChange]));

  // ─── Show Today button ────────────────

  const showToday = useMemo(() => {
    if (view === "week") {
      return weekStart !== getWeekStart(todayYMD());
    }
    const t = todayYMD().split("-").map(Number);
    return monthYear !== t[0] || monthNum !== t[1];
  }, [view, weekStart, monthYear, monthNum]);

  const hasData = !loading || sessions.length > 0;

  return (
    <div className="p-4 lg:p-8 space-y-4">
      <CalendarHeader
        view={view}
        onViewChange={handleViewChange}
        title={title}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        showToday={showToday}
        onAddSession={() => setShowManualEntry(true)}
      />

      {/* Department color legend */}
      {sessions.length > 0 && <DeptLegend sessions={sessions} />}

      {/* Loading skeleton */}
      {loading && sessions.length === 0 && (
        <div className="rounded-xl border border-border bg-bg overflow-hidden">
          {view === "week" ? <CalendarWeekSkeleton /> : <CalendarMonthSkeleton />}
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <EmptyState
          icon={CalendarX2}
          title={`No sessions this ${view}`}
          description="Start a focus session to see it appear on your calendar."
          action={{
            label: "Go to Timer",
            onClick: () => navigate("/timer"),
          }}
        />
      )}

      {/* Calendar content */}
      {hasData && sessions.length > 0 && (
        <AnimatePresence mode="wait">
          {view === "week" ? (
            <motion.div
              key={`week-${weekStart}`}
              className="rounded-xl border border-border bg-bg overflow-hidden"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
                <div className="min-w-[700px]">
                  <WeekView
                    weekStart={weekStart}
                    sessions={sessions}
                    onSelectSession={handleSelectSession}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`month-${monthYear}-${monthNum}`}
              className="rounded-xl border border-border bg-bg overflow-hidden"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <MonthGrid
                year={monthYear}
                month={monthNum}
                sessions={sessions}
                onSelectDate={handleSelectDate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Session detail slide-over */}
      <SessionDetailPanel
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onUpdated={(updated) => {
          if (updated) setSelectedSession(updated);
          fetchSessions();
        }}
      />

      {/* Manual entry modal */}
      <AnimatePresence>
        {showManualEntry && (
          <ManualEntryModal
            onClose={() => setShowManualEntry(false)}
            onCreated={() => { setShowManualEntry(false); fetchSessions(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
