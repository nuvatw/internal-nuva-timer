import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  Timer,
  SearchX,
} from "lucide-react";
import { listVariants, listItemVariants } from "../lib/motion";
import EmptyState from "../components/EmptyState";
import SessionDetailPanel from "../components/SessionDetailPanel";
import ExportMenu from "../components/ExportMenu";
import { api } from "../lib/api";
import {
  todayYMD,
  addDays,
  toYMD,
  getWeekNumber,
  getWeekRange,
  getCurrentWeekNumber,
  formatDateRange,
  formatFullDate,
  formatShortDate,
  formatTime,
  formatMinutes,
} from "../lib/dates";
import FilterBar, { type Filters } from "../components/FilterBar";
import WeekSelector from "../components/WeekSelector";
import DateRangePicker from "../components/DateRangePicker";
import { ReviewSkeleton } from "../components/Skeleton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

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

// ─── Chart Colors ─────────────────────────

const DEPT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#f97316", // orange
  "#14b8a6", // teal
];

const STATUS_COLORS: Record<string, string> = {
  completed_yes: "#22c55e",
  completed_no: "#f59e0b",
  canceled: "#a3a3a3",
};

const STATUS_LABELS: Record<string, string> = {
  completed_yes: "Completed",
  completed_no: "Changed",
  canceled: "Canceled",
};

// ─── URL State Helpers ──────────────────────

const DEFAULT_FILTERS: Filters = { departmentId: "", projectId: "", status: "", durationMinutes: "", q: "" };

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    departmentId: params.get("dept") ?? "",
    projectId: params.get("proj") ?? "",
    status: params.get("status") ?? "",
    durationMinutes: params.get("dur") ?? "",
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
  if (filters.durationMinutes) params.set("dur", filters.durationMinutes);
  else params.delete("dur");
  if (filters.q) params.set("q", filters.q);
  else params.delete("q");
}

// ─── Summary Cards ─────────────────────────

const SummaryCards = memo(function SummaryCards({ summary, sessions }: { summary: Summary; sessions: Session[] }) {
  const { completionRate, avgMinutes } = useMemo(() => {
    const completedCount = sessions.filter((s) => s.status === "completed_yes").length;
    return {
      completionRate: sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0,
      avgMinutes: summary.session_count > 0 ? Math.round(summary.total_minutes / summary.session_count) : 0,
    };
  }, [sessions, summary.session_count, summary.total_minutes]);

  const cards = [
    {
      label: "Focus Time",
      value: formatMinutes(summary.total_minutes),
      icon: Clock,
    },
    {
      label: "Sessions",
      value: String(summary.session_count),
      icon: Hash,
    },
    {
      label: "Avg Session",
      value: avgMinutes > 0 ? `${avgMinutes}m` : "—",
      icon: TrendingUp,
    },
    {
      label: "Completion",
      value: sessions.length > 0 ? `${completionRate}%` : "—",
      icon: CheckCircle2,
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-lg border border-border bg-bg p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Icon size={13} strokeWidth={1.75} className="text-text-tertiary" />
            <p className="text-xs text-text-tertiary uppercase tracking-wider">{label}</p>
          </div>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
        </div>
      ))}
    </motion.div>
  );
});

// ─── Department Bar Chart ─────────────────

const DepartmentBarChart = memo(function DepartmentBarChart({
  departments,
}: {
  departments: Summary["by_department"];
}) {
  const data = useMemo(
    () =>
      departments.map((d, i) => ({
        name: d.name,
        minutes: d.total_minutes,
        sessions: d.count,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
      })),
    [departments],
  );

  if (departments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg p-8 flex flex-col items-center justify-center text-center">
        <Timer size={20} strokeWidth={1.5} className="text-text-tertiary mb-2" />
        <p className="text-sm text-text-tertiary">No department data for this period</p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-lg border border-border bg-bg p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">By Department</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMinutes(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-raised)", opacity: 0.5 }}
              contentStyle={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number) => [formatMinutes(value), "Time"]}
            />
            <Bar dataKey="minutes" radius={[0, 4, 4, 0]} animationDuration={600}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});

// ─── Status Pie Chart ─────────────────────

const StatusPieChart = memo(function StatusPieChart({ sessions }: { sessions: Session[] }) {
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.status] = (counts[s.status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        fill: STATUS_COLORS[status] || "#a3a3a3",
      }))
      .sort((a, b) => b.value - a.value);
  }, [sessions]);

  if (breakdown.length === 0) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-bg p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Status Breakdown</h3>
      <div className="flex items-center gap-6">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                animationDuration={600}
                stroke="none"
              >
                {breakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          {breakdown.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-text-secondary flex-1 truncate">{item.name}</span>
              <span className="text-text-primary font-medium tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Custom Tooltip ─────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-text-tertiary mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          {entry.color && (
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          )}
          <span className="text-text-primary font-medium tabular-nums">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Daily Focus Trend (Area Chart) ────────

const DailyTrendChart = memo(function DailyTrendChart({
  sessions,
  dateStart,
  dateEnd,
}: {
  sessions: Session[];
  dateStart: string;
  dateEnd: string;
}) {
  const data = useMemo(() => {
    // Build a map of date → minutes
    const dateMap = new Map<string, number>();
    for (const s of sessions) {
      const date = toYMD(new Date(s.started_at));
      dateMap.set(date, (dateMap.get(date) || 0) + s.duration_minutes);
    }

    // Fill in all dates in range
    const result: { date: string; label: string; minutes: number }[] = [];
    let current = dateStart;
    while (current <= dateEnd) {
      result.push({
        date: current,
        label: formatShortDate(current),
        minutes: dateMap.get(current) || 0,
      });
      current = addDays(current, 1);
    }
    return result;
  }, [sessions, dateStart, dateEnd]);

  if (data.length <= 1) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-bg p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Daily Focus Trend</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => formatMinutes(v)}
            />
            <Tooltip
              content={
                <ChartTooltip formatter={(v) => formatMinutes(v)} />
              }
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="url(#focusGradient)"
              animationDuration={600}
              dot={data.length <= 14 ? { r: 3, fill: "var(--color-accent)", strokeWidth: 0 } : false}
              activeDot={{ r: 4, fill: "var(--color-accent)", strokeWidth: 2, stroke: "var(--color-bg)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});

// ─── Time of Day Distribution ──────────────

const HOUR_LABELS = [
  "12a", "1a", "2a", "3a", "4a", "5a",
  "6a", "7a", "8a", "9a", "10a", "11a",
  "12p", "1p", "2p", "3p", "4p", "5p",
  "6p", "7p", "8p", "9p", "10p", "11p",
];

const TimeOfDayChart = memo(function TimeOfDayChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    for (const s of sessions) {
      const d = new Date(s.started_at);
      // Get hour in Asia/Taipei
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Taipei",
          hour: "numeric",
          hour12: false,
        }).format(d)
      );
      hourCounts[hour]++;
    }
    return hourCounts.map((count, hour) => ({
      hour: HOUR_LABELS[hour],
      count,
    }));
  }, [sessions]);

  const maxCount = Math.max(...data.map((d) => d.count));
  if (maxCount === 0) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-bg p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">Time of Day</h3>
      <div className="flex items-end gap-[3px] h-24">
        {data.map((d, i) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className="w-full rounded-sm transition-colors"
                style={{
                  height: `${Math.max(pct, d.count > 0 ? 8 : 2)}%`,
                  backgroundColor: d.count > 0 ? "var(--color-accent)" : "var(--color-border)",
                  opacity: d.count > 0 ? 0.7 + (pct / 100) * 0.3 : 0.3,
                }}
              />
              {/* Tooltip on hover */}
              {d.count > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] text-text-primary shadow whitespace-nowrap z-10">
                  {d.count} session{d.count !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex text-[9px] text-text-tertiary">
        <span className="flex-1 text-left">12am</span>
        <span className="flex-1 text-center">6am</span>
        <span className="flex-1 text-center">12pm</span>
        <span className="flex-1 text-center">6pm</span>
        <span className="flex-[0.3] text-right">12</span>
      </div>
    </motion.div>
  );
});

// ─── Project Distribution ──────────────────

const ProjectBarChart = memo(function ProjectBarChart({ sessions }: { sessions: Session[] }) {
  const data = useMemo(() => {
    const projectMap = new Map<string, { name: string; minutes: number; count: number }>();
    for (const s of sessions) {
      const key = s.project_id;
      const label = s.projects.code
        ? `${s.projects.code} ${s.projects.name}`
        : s.projects.name;
      const existing = projectMap.get(key) || { name: label, minutes: 0, count: 0 };
      existing.minutes += s.duration_minutes;
      existing.count++;
      projectMap.set(key, existing);
    }
    return Array.from(projectMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6)
      .map((d, i) => ({
        ...d,
        fill: DEPT_COLORS[(i + 2) % DEPT_COLORS.length],
      }));
  }, [sessions]);

  if (data.length === 0) return null;

  return (
    <motion.div
      className="rounded-lg border border-border bg-bg p-4 space-y-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider">By Project</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMinutes(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, name) =>
                    name === "minutes" ? formatMinutes(v) : `${v} sessions`
                  }
                />
              }
            />
            <Bar dataKey="minutes" radius={[0, 4, 4, 0]} animationDuration={600}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});

// ─── Session Card ──────────────────────────

function statusLabel(status: string) {
  switch (status) {
    case "completed_yes":
      return { text: "Completed", cls: "text-success bg-success-muted" };
    case "completed_no":
      return { text: "Changed", cls: "text-warning bg-warning-muted" };
    case "canceled":
      return { text: "Canceled", cls: "text-text-tertiary bg-surface-raised" };
    default:
      return { text: status, cls: "text-text-tertiary bg-surface-raised" };
  }
}

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
            <span>{formatTime(session.started_at)}</span>
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

function SessionList({
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

// ─── Build Query String ─────────────────────

function buildQueryParams(start: string, end: string, filters: Filters): string {
  const params = new URLSearchParams();
  params.set("start", start);
  params.set("end", end);
  if (filters.departmentId) params.set("department_id", filters.departmentId);
  if (filters.projectId) params.set("project_id", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.durationMinutes) params.set("duration_minutes", filters.durationMinutes);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

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
        <ExportMenu queryString={exportQs.current} disabled={loading} />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {/* Summary cards */}
            {summary && <SummaryCards summary={summary} sessions={sessions} />}

            {/* Daily trend — only in multi-day views */}
            {viewMode !== "day" && sessions.length > 0 && (
              <DailyTrendChart
                sessions={sessions}
                dateStart={dateRange.start}
                dateEnd={dateRange.end}
              />
            )}

            {/* Charts row — departments + status */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <DepartmentBarChart departments={summary.by_department} />
                </div>
                <div className="col-span-1">
                  <StatusPieChart sessions={sessions} />
                </div>
              </div>
            )}

            {/* Charts row — projects + time of day */}
            {sessions.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <ProjectBarChart sessions={sessions} />
                </div>
                <div className="col-span-1">
                  <TimeOfDayChart sessions={sessions} />
                </div>
              </div>
            )}

            {/* Session list */}
            <SessionList
              sessions={sessions}
              hasFilters={!!hasActiveFilters}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onSelectSession={setSelectedSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session detail slide-over */}
      <SessionDetailPanel
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onUpdated={fetchData}
      />
    </div>
  );
}
