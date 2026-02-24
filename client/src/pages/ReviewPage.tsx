import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { sectionStaggerVariants, sectionItemVariants } from "../lib/motion";
import { api } from "../lib/api";
import {
  todayYMD,
  addDays,
  getWeekNumber,
  getWeekRange,
  getCurrentWeekNumber,
  formatDateRange,
  formatFullDate,
} from "../lib/dates";
import FilterBar, { type Filters } from "../components/FilterBar";
import WeekSelector from "../components/WeekSelector";
import DateRangePicker from "../components/DateRangePicker";
import { ReviewSkeleton } from "../components/Skeleton";
import SessionDetailPanel from "../components/SessionDetailPanel";
import ExportMenu from "../components/ExportMenu";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { Summary, Session } from "../types/models";

import { DEFAULT_FILTERS, filtersFromParams, filtersToParams, buildQueryParams } from "../components/review/url-state";
import SummaryCards from "../components/review/SummaryCards";
import DepartmentBarChart from "../components/review/DepartmentBarChart";
import StatusPieChart from "../components/review/StatusPieChart";
import DailyTrendChart from "../components/review/DailyTrendChart";
import TimeOfDayChart from "../components/review/TimeOfDayChart";
import ProjectBarChart from "../components/review/ProjectBarChart";
import SessionList from "../components/review/SessionList";
import ManualEntryModal from "../components/review/ManualEntryModal";

// ─── Types ─────────────────────────────────

type ViewMode = "day" | "week" | "range";

// ─── Review Page ───────────────────────────

export default function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialViewMode = (searchParams.get("view") ?? "day") as ViewMode;
  const initialDate = searchParams.get("date") ?? todayYMD();
  const initialWeekFrom = Number(searchParams.get("wf")) || getCurrentWeekNumber();
  const initialWeekTo = Number(searchParams.get("wt")) || initialWeekFrom;
  const initialRangeStart = searchParams.get("rs") ?? todayYMD();
  const initialRangeEnd = searchParams.get("re") ?? todayYMD();

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [weekFrom, setWeekFrom] = useState(initialWeekFrom);
  const [weekTo, setWeekTo] = useState(initialWeekTo);
  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [filters, setFilters] = useState<Filters>(filtersFromParams(searchParams));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const dateRange = (() => {
    if (viewMode === "day") {
      return { start: currentDate, end: currentDate };
    }
    if (viewMode === "week") {
      const startRange = getWeekRange(weekFrom);
      const endRange = getWeekRange(weekTo);
      return { start: startRange.start, end: endRange.end };
    }
    return { start: rangeStart, end: rangeEnd };
  })();

  const currentWeekNum = getCurrentWeekNumber();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", viewMode);

    if (viewMode === "day") {
      params.set("date", currentDate);
    } else if (viewMode === "week") {
      params.set("wf", String(weekFrom));
      params.set("wt", String(weekTo));
    } else {
      params.set("rs", rangeStart);
      params.set("re", rangeEnd);
    }

    filtersToParams(filters, params);
    setSearchParams(params, { replace: true });
  }, [viewMode, currentDate, weekFrom, weekTo, rangeStart, rangeEnd, filters, setSearchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryParams(dateRange.start, dateRange.end, filters);
      const [summaryData, sessionsData] = await Promise.all([
        api.get<Summary>(`/reports/summary?${qs}`),
        api.get<Session[]>(`/sessions?${qs}`),
      ]);
      setSummary(summaryData);
      setSessions(sessionsData);
      setSelectedSession((prev) => {
        if (!prev) return null;
        return sessionsData.find((s) => s.id === prev.id) ?? null;
      });
    } catch {
      setSummary(null);
      setSessions([]);
    }
    setLoading(false);
  }, [dateRange.start, dateRange.end, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigatePrevDay = () => setCurrentDate((d) => addDays(d, -1));
  const navigateNextDay = () => setCurrentDate((d) => addDays(d, 1));
  const goToToday = () => setCurrentDate(todayYMD());

  const handleWeekChange = (wf: number, wt: number) => {
    setWeekFrom(wf);
    setWeekTo(wt);
  };

  const handleRangeApply = (start: string, end: string) => {
    setRangeStart(start);
    setRangeEnd(end);
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "week") {
      const wn = getWeekNumber(currentDate);
      if (wn > 0) {
        setWeekFrom(wn);
        setWeekTo(wn);
      }
    } else if (mode === "range") {
      setRangeStart(dateRange.start);
      setRangeEnd(dateRange.end);
    }
  };

  const dateLabel = (() => {
    if (viewMode === "day") return formatFullDate(currentDate);
    if (viewMode === "week") {
      if (weekFrom === weekTo) {
        return `Week ${weekFrom}: ${formatDateRange(dateRange.start, dateRange.end)}`;
      }
      return `Week ${weekFrom}–${weekTo}: ${formatDateRange(dateRange.start, dateRange.end)}`;
    }
    return formatDateRange(dateRange.start, dateRange.end);
  })();

  useDocumentTitle(`Review — ${dateLabel}`);

  const isToday = currentDate === todayYMD();
  const hasActiveFilters = filters.departmentId || filters.projectId || filters.status || filters.durationMinutes || filters.q;

  const exportQs = useRef("");
  exportQs.current = buildQueryParams(dateRange.start, dateRange.end, filters);

  return (
    <div className="p-4 lg:p-8 space-y-5">
      {/* Screen-reader live region for loading state */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? "Loading session data" : `Loaded ${sessions.length} sessions`}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Review</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualEntry(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-raised transition-colors active:scale-[0.97]"
          >
            <Plus size={15} strokeWidth={2} />
            Add Session
          </button>
          <ExportMenu queryString={exportQs.current} disabled={loading} />
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-raised p-1">
        {(["day", "week", "range"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleViewChange(mode)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode
                ? "bg-bg text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {mode === "day" ? "Day" : mode === "week" ? "Week" : "Custom"}
          </button>
        ))}
      </div>

      {/* Date navigation — animated mode switch */}
      <AnimatePresence mode="wait">
        {viewMode === "day" && (
          <motion.div
            key="day-nav"
            className="space-y-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={navigatePrevDay}
                className="rounded-lg border border-border bg-bg p-1.5 text-text-secondary hover:bg-surface-raised transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <p className="text-sm font-medium text-text-primary">{dateLabel}</p>
              <button
                onClick={navigateNextDay}
                className="rounded-lg border border-border bg-bg p-1.5 text-text-secondary hover:bg-surface-raised transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
            {!isToday && (
              <button
                onClick={goToToday}
                className="text-xs text-accent hover:text-accent-hover font-medium"
              >
                Go to today
              </button>
            )}
          </motion.div>
        )}

        {viewMode === "week" && (
          <motion.div
            key="week-nav"
            className="space-y-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <WeekSelector
              weekFrom={weekFrom}
              weekTo={weekTo}
              onChange={handleWeekChange}
            />
            {weekFrom !== currentWeekNum && currentWeekNum > 0 && (
              <button
                onClick={() => handleWeekChange(currentWeekNum, currentWeekNum)}
                className="text-xs text-accent hover:text-accent-hover font-medium"
              >
                Go to current week
              </button>
            )}
          </motion.div>
        )}

        {viewMode === "range" && (
          <motion.div
            key="range-nav"
            className="space-y-2"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-3">
              <DateRangePicker
                start={rangeStart}
                end={rangeEnd}
                onApply={handleRangeApply}
              />
              <p className="text-sm text-text-secondary">{dateLabel}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Filters active</span>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-accent hover:text-accent-hover font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ReviewSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="space-y-5"
            variants={sectionStaggerVariants}
            initial="initial"
            animate="animate"
          >
            {summary && (
              <motion.div variants={sectionItemVariants}>
                <SummaryCards summary={summary} sessions={sessions} />
              </motion.div>
            )}

            {viewMode !== "day" && sessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <DailyTrendChart
                  sessions={sessions}
                  dateStart={dateRange.start}
                  dateEnd={dateRange.end}
                />
              </motion.div>
            )}

            {summary && (
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="lg:col-span-2">
                  <DepartmentBarChart departments={summary.by_department} />
                </div>
                <div className="col-span-1">
                  <StatusPieChart sessions={sessions} />
                </div>
              </motion.div>
            )}

            {sessions.length > 0 && (
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="lg:col-span-2">
                  <ProjectBarChart sessions={sessions} />
                </div>
                <div className="col-span-1">
                  <TimeOfDayChart sessions={sessions} />
                </div>
              </motion.div>
            )}

            <motion.div variants={sectionItemVariants}>
              <SessionList
                sessions={sessions}
                hasFilters={!!hasActiveFilters}
                onClearFilters={() => setFilters(DEFAULT_FILTERS)}
                onSelectSession={setSelectedSession}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SessionDetailPanel
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onUpdated={(updated) => {
          if (updated) setSelectedSession(updated);
          fetchData();
        }}
      />

      <AnimatePresence>
        {showManualEntry && (
          <ManualEntryModal
            onClose={() => setShowManualEntry(false)}
            onSaved={() => {
              setShowManualEntry(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
