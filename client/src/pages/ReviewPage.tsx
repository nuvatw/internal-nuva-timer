import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import {
  todayYMD,
  addDays,
  getWeekNumber,
  getWeekRange,
  getCurrentWeekNumber,
  formatDateRange,
  formatFullDate,
  formatTime,
  formatMinutes,
} from "../lib/dates";
import FilterBar, { type Filters } from "../components/FilterBar";
import WeekSelector from "../components/WeekSelector";
import DateRangePicker from "../components/DateRangePicker";
import { ReviewSkeleton } from "../components/Skeleton";

// ─── Types ─────────────────────────────────

type ViewMode = "day" | "week" | "range";

interface Summary {
  total_minutes: number;
  session_count: number;
  by_department: {
    department_id: string;
    name: string;
    total_minutes: number;
    count: number;
  }[];
}

interface Session {
  id: string;
  department_id: string;
  project_id: string;
  duration_minutes: number;
  status: string;
  planned_title: string;
  actual_title: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  canceled_at: string | null;
  elapsed_seconds: number | null;
  departments: { name: string };
  projects: { code: string | null; name: string };
}

// ─── URL State Helpers ──────────────────────

const DEFAULT_FILTERS: Filters = { departmentId: "", projectId: "", status: "", q: "" };

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    departmentId: params.get("dept") ?? "",
    projectId: params.get("proj") ?? "",
    status: params.get("status") ?? "",
    q: params.get("q") ?? "",
  };
}

function filtersToParams(filters: Filters, params: URLSearchParams): void {
  if (filters.departmentId) params.set("dept", filters.departmentId);
  else params.delete("dept");
  if (filters.projectId) params.set("proj", filters.projectId);
  else params.delete("proj");
  if (filters.status) params.set("status", filters.status);
  else params.delete("status");
  if (filters.q) params.set("q", filters.q);
  else params.delete("q");
}

// ─── Summary Cards ─────────────────────────

function SummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Time</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatMinutes(summary.total_minutes)}
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Sessions</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {summary.session_count}
        </p>
      </div>
    </div>
  );
}

// ─── Department Distribution ───────────────

function DepartmentChart({ departments, totalMinutes }: {
  departments: Summary["by_department"];
  totalMinutes: number;
}) {
  if (departments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400 text-center">No data for this period</p>
      </div>
    );
  }

  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-teal-500",
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-xs text-gray-500 uppercase tracking-wide">By Department</h3>
      {departments.map((dept, i) => {
        const pct = totalMinutes > 0 ? (dept.total_minutes / totalMinutes) * 100 : 0;
        return (
          <div key={dept.department_id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">{dept.name}</span>
              <span className="text-gray-500">
                {formatMinutes(dept.total_minutes)}
                <span className="text-gray-400 ml-1">({Math.round(pct)}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Session Card ──────────────────────────

function statusLabel(status: string) {
  switch (status) {
    case "completed_yes":
      return { text: "Completed", cls: "text-green-600 bg-green-50" };
    case "completed_no":
      return { text: "Changed", cls: "text-amber-600 bg-amber-50" };
    case "canceled":
      return { text: "Canceled", cls: "text-gray-500 bg-gray-100" };
    default:
      return { text: status, cls: "text-gray-500 bg-gray-100" };
  }
}

function SessionCard({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const st = statusLabel(session.status);
  const displayTitle =
    session.status === "completed_no" && session.actual_title
      ? session.actual_title
      : session.planned_title;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatTime(session.started_at)}</span>
            <span>&middot;</span>
            <span>
              {session.departments.name} / {session.projects.code ?? session.projects.name}
            </span>
            <span>&middot;</span>
            <span>{session.duration_minutes}m</span>
          </div>
          <p className="mt-1 text-sm text-gray-800 font-medium truncate">
            {displayTitle}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
          {st.text}
        </span>
      </div>

      {/* Actual title callout */}
      {!expanded && session.status === "completed_no" && session.actual_title && (
        <p className="mt-1 text-xs text-amber-600 truncate">
          Planned: &ldquo;{session.planned_title}&rdquo;
        </p>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-600">
          <div>
            <span className="text-gray-400 text-xs">Planned: </span>
            {session.planned_title}
          </div>
          {session.actual_title && (
            <div>
              <span className="text-gray-400 text-xs">Actually did: </span>
              {session.actual_title}
            </div>
          )}
          {session.notes && (
            <div>
              <span className="text-gray-400 text-xs">Notes: </span>
              {session.notes}
            </div>
          )}
          {session.ended_at && (
            <div className="text-xs text-gray-400">
              Ended: {formatTime(session.ended_at)}
            </div>
          )}
          {session.status === "canceled" && session.elapsed_seconds != null && (
            <div className="text-xs text-gray-400">
              Elapsed before cancel: {Math.floor(session.elapsed_seconds / 60)}m {session.elapsed_seconds % 60}s
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Session List ──────────────────────────

function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">No sessions in this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs text-gray-500 uppercase tracking-wide">Sessions</h3>
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
    </div>
  );
}

// ─── Build Query String ─────────────────────

function buildQueryParams(start: string, end: string, filters: Filters): string {
  const params = new URLSearchParams();
  params.set("start", start);
  params.set("end", end);
  if (filters.departmentId) params.set("department_id", filters.departmentId);
  if (filters.projectId) params.set("project_id", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

// ─── Review Page ───────────────────────────

export default function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL
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

  // Compute the date range based on view mode
  const dateRange = (() => {
    if (viewMode === "day") {
      return { start: currentDate, end: currentDate };
    }
    if (viewMode === "week") {
      const startRange = getWeekRange(weekFrom);
      const endRange = getWeekRange(weekTo);
      return { start: startRange.start, end: endRange.end };
    }
    // range mode
    return { start: rangeStart, end: rangeEnd };
  })();

  const currentWeekNum = getCurrentWeekNumber();

  // Sync state to URL
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

  // Fetch data
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
    } catch {
      setSummary(null);
      setSessions([]);
    }
    setLoading(false);
  }, [dateRange.start, dateRange.end, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Day navigation
  const navigatePrevDay = () => setCurrentDate((d) => addDays(d, -1));
  const navigateNextDay = () => setCurrentDate((d) => addDays(d, 1));
  const goToToday = () => setCurrentDate(todayYMD());

  // Week selector change
  const handleWeekChange = (wf: number, wt: number) => {
    setWeekFrom(wf);
    setWeekTo(wt);
  };

  // Date range picker apply
  const handleRangeApply = (start: string, end: string) => {
    setRangeStart(start);
    setRangeEnd(end);
  };

  // View mode change
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "week") {
      // Set week selectors to current week
      const wn = getWeekNumber(currentDate);
      if (wn > 0) {
        setWeekFrom(wn);
        setWeekTo(wn);
      }
    } else if (mode === "range") {
      // Initialize range from current context
      setRangeStart(dateRange.start);
      setRangeEnd(dateRange.end);
    }
  };

  // Display label
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

  const isToday = currentDate === todayYMD();
  const hasActiveFilters = filters.departmentId || filters.projectId || filters.status || filters.q;

  // Export
  const [exporting, setExporting] = useState<"csv" | "md" | null>(null);
  const exportQs = useRef("");
  exportQs.current = buildQueryParams(dateRange.start, dateRange.end, filters);

  const handleExportCsv = async () => {
    setExporting("csv");
    try {
      await api.download(`/exports/sessions.csv?${exportQs.current}`);
    } catch { /* ignore */ }
    setExporting(null);
  };

  const handleExportMd = async () => {
    setExporting("md");
    try {
      await api.download(`/exports/summary.md?${exportQs.current}`);
    } catch { /* ignore */ }
    setExporting(null);
  };

  return (
    <div className="p-6 space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        {(["day", "week", "range"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleViewChange(mode)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === mode
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {mode === "day" ? "Day" : mode === "week" ? "Week" : "Custom"}
          </button>
        ))}
      </div>

      {/* Date navigation — Day mode */}
      {viewMode === "day" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <button
              onClick={navigatePrevDay}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Previous day"
            >
              &larr;
            </button>
            <p className="text-sm font-medium text-gray-800">{dateLabel}</p>
            <button
              onClick={navigateNextDay}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Next day"
            >
              &rarr;
            </button>
          </div>
          {!isToday && (
            <button
              onClick={goToToday}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Go to today
            </button>
          )}
        </div>
      )}

      {/* Week selector — Week mode */}
      {viewMode === "week" && (
        <div className="space-y-1">
          <WeekSelector
            weekFrom={weekFrom}
            weekTo={weekTo}
            onChange={handleWeekChange}
          />
          {weekFrom !== currentWeekNum && currentWeekNum > 0 && (
            <button
              onClick={() => handleWeekChange(currentWeekNum, currentWeekNum)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Go to current week
            </button>
          )}
        </div>
      )}

      {/* Date range picker — Range mode */}
      {viewMode === "range" && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <DateRangePicker
              start={rangeStart}
              end={rangeEnd}
              onApply={handleRangeApply}
            />
            <p className="text-sm text-gray-600">{dateLabel}</p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filters active</span>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportCsv}
          disabled={exporting !== null || loading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {exporting === "csv" ? "Exporting..." : "Export CSV"}
        </button>
        <button
          onClick={handleExportMd}
          disabled={exporting !== null || loading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {exporting === "md" ? "Exporting..." : "Export MD"}
        </button>
      </div>

      {loading ? (
        <ReviewSkeleton />
      ) : (
        <>
          {/* Summary cards */}
          {summary && <SummaryCards summary={summary} />}

          {/* Department distribution */}
          {summary && (
            <DepartmentChart
              departments={summary.by_department}
              totalMinutes={summary.total_minutes}
            />
          )}

          {/* Session list */}
          <SessionList sessions={sessions} />
        </>
      )}
    </div>
  );
}
