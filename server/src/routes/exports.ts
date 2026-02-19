import { Router, Request, Response } from "express";
import Papa from "papaparse";
import { supabase } from "../supabase.js";
import { validateDateParams, asyncHandler } from "../middleware/validate.js";

const router = Router();

// ─── Shared: fetch sessions with filters ───

interface SessionRow {
  started_at: string;
  ended_at: string | null;
  canceled_at: string | null;
  elapsed_seconds: number | null;
  duration_minutes: number;
  status: string;
  planned_title: string;
  actual_title: string | null;
  notes: string | null;
  department_id: string;
  departments: { name: string } | null;
  projects: { code: string | null; name: string } | null;
}

async function fetchFilteredSessions(
  userId: string,
  query: Record<string, unknown>
): Promise<{ sessions: SessionRow[]; error: string | null }> {
  const { start, end, department_id, project_id, status, q, duration_minutes } = query;

  if (!start || !end) {
    return { sessions: [], error: "start and end query params are required" };
  }

  let dbQuery = supabase
    .from("sessions")
    .select("started_at, ended_at, canceled_at, elapsed_seconds, duration_minutes, status, planned_title, actual_title, notes, department_id, departments(name), projects(code, name)")
    .eq("user_id", userId)
    .gte("started_at", `${start}T00:00:00+08:00`)
    .lte("started_at", `${end}T23:59:59+08:00`)
    .order("started_at", { ascending: true });

  if (department_id) dbQuery = dbQuery.eq("department_id", department_id as string);
  if (project_id) dbQuery = dbQuery.eq("project_id", project_id as string);
  if (status) {
    dbQuery = dbQuery.eq("status", status as string);
  } else {
    dbQuery = dbQuery.in("status", ["completed_yes", "completed_no", "canceled"]);
  }
  if (duration_minutes) dbQuery = dbQuery.eq("duration_minutes", Number(duration_minutes));
  if (q) {
    const keyword = `%${(q as string).slice(0, 100)}%`;
    dbQuery = dbQuery.or(`planned_title.ilike.${keyword},actual_title.ilike.${keyword},notes.ilike.${keyword}`);
  }

  const { data, error } = await dbQuery;
  if (error) return { sessions: [], error: error.message };

  return {
    sessions: (data ?? []) as unknown as SessionRow[],
    error: null,
  };
}

// ─── Helpers ────────────────────────────────

const TZ = "Asia/Taipei";

function formatDateTZ(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function formatTimeTZ(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function statusText(s: string): string {
  switch (s) {
    case "completed_yes": return "Completed";
    case "completed_no": return "Changed";
    case "canceled": return "Canceled";
    default: return s;
  }
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins}m`;
  if (mins === 0) return `${h}h`;
  return `${h}h ${mins}m`;
}

function formatElapsed(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function buildSummary(sessions: SessionRow[]) {
  let totalMinutes = 0;
  let sessionCount = 0;
  const byDept = new Map<string, { name: string; minutes: number; count: number }>();
  const byProject = new Map<string, { name: string; code: string | null; minutes: number; count: number }>();

  for (const s of sessions) {
    totalMinutes += s.duration_minutes;
    sessionCount++;

    const deptName = (s.departments as unknown as { name: string } | null)?.name ?? "Unknown";
    const existing = byDept.get(s.department_id);
    if (existing) {
      existing.minutes += s.duration_minutes;
      existing.count++;
    } else {
      byDept.set(s.department_id, { name: deptName, minutes: s.duration_minutes, count: 1 });
    }

    const proj = s.projects as unknown as { code: string | null; name: string } | null;
    if (proj) {
      const projKey = proj.code ?? proj.name;
      const ep = byProject.get(projKey);
      if (ep) {
        ep.minutes += s.duration_minutes;
        ep.count++;
      } else {
        byProject.set(projKey, { name: proj.name, code: proj.code, minutes: s.duration_minutes, count: 1 });
      }
    }
  }

  const departments = Array.from(byDept.values()).sort((a, b) => b.minutes - a.minutes);
  const projects = Array.from(byProject.values()).sort((a, b) => b.minutes - a.minutes);
  return { totalMinutes, sessionCount, departments, projects };
}

// Week number anchored at Week 1 = Feb 2, 2026 (Monday)
const WEEK1_START = new Date("2026-02-02T00:00:00+08:00");

function getWeekNumber(ymd: string): number {
  const d = new Date(`${ymd}T00:00:00+08:00`);
  const diffMs = d.getTime() - WEEK1_START.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function buildTitle(start: string, end: string): string {
  const weekNum = getWeekNumber(start);
  const weekEnd = getWeekNumber(end);

  if (weekNum > 0 && weekNum === weekEnd) {
    return `Week ${weekNum} (${start} – ${end})`;
  }
  if (weekNum > 0 && weekEnd > 0 && weekNum !== weekEnd) {
    return `Week ${weekNum}–${weekEnd} (${start} – ${end})`;
  }
  return `${start} – ${end}`;
}

// ─── CSV Export ─────────────────────────────

router.get("/sessions.csv", validateDateParams, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessions, error } = await fetchFilteredSessions(userId, req.query as Record<string, unknown>);

  if (error) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error } });
    return;
  }

  const summary = buildSummary(sessions);

  const columns = [
    "Date", "Start", "End", "Department", "Project",
    "Duration (min)", "Status", "Planned Title", "Actual Title", "Notes",
  ];

  // Build CSV rows
  const rows: Record<string, string>[] = [];
  const emptyRow = () => Object.fromEntries(columns.map((c) => [c, ""]));

  // Summary header rows
  const summaryRow = (key: string, val: string) => ({ ...emptyRow(), Date: key, Start: val });
  rows.push(summaryRow("# Summary", ""));
  rows.push(summaryRow("Total Time", formatMinutes(summary.totalMinutes)));
  rows.push(summaryRow("Total Sessions", String(summary.sessionCount)));

  for (const dept of summary.departments) {
    rows.push(summaryRow(dept.name, `${formatMinutes(dept.minutes)} (${dept.count} sessions)`));
  }

  if (summary.projects.length > 0) {
    rows.push(emptyRow());
    rows.push(summaryRow("# By Project", ""));
    for (const proj of summary.projects) {
      const label = proj.code ? `${proj.code} — ${proj.name}` : proj.name;
      rows.push(summaryRow(label, `${formatMinutes(proj.minutes)} (${proj.count} sessions)`));
    }
  }

  rows.push(emptyRow());
  rows.push(summaryRow("# Sessions", ""));

  // Session rows
  for (const s of sessions) {
    const proj = s.projects as unknown as { code: string | null; name: string } | null;
    const endTime = s.ended_at
      ? formatTimeTZ(s.ended_at)
      : s.canceled_at
        ? `${formatTimeTZ(s.canceled_at)} (canceled, ${formatElapsed(s.elapsed_seconds)})`
        : "";

    rows.push({
      Date: formatDateTZ(s.started_at),
      Start: formatTimeTZ(s.started_at),
      End: endTime,
      Department: (s.departments as unknown as { name: string } | null)?.name ?? "",
      Project: proj?.code ? `${proj.code} — ${proj.name}` : proj?.name ?? "",
      "Duration (min)": String(s.duration_minutes),
      Status: statusText(s.status),
      "Planned Title": s.planned_title,
      "Actual Title": s.actual_title ?? "",
      Notes: s.notes ?? "",
    });
  }

  const csv = Papa.unparse(rows);

  const start = req.query.start as string;
  const end = req.query.end as string;
  const filename = `nuva-sessions-${start.replace(/-/g, "")}-${end.replace(/-/g, "")}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}));

// ─── Markdown Export ────────────────────────

router.get("/summary.md", validateDateParams, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessions, error } = await fetchFilteredSessions(userId, req.query as Record<string, unknown>);

  if (error) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error } });
    return;
  }

  const start = req.query.start as string;
  const end = req.query.end as string;
  const summary = buildSummary(sessions);
  const titlePart = buildTitle(start, end);

  const lines: string[] = [
    `# nuva Report — ${titlePart}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Time | **${formatMinutes(summary.totalMinutes)}** |`,
    `| Sessions | **${summary.sessionCount}** |`,
    `| Avg Session | **${summary.sessionCount > 0 ? formatMinutes(Math.round(summary.totalMinutes / summary.sessionCount)) : "—"}** |`,
    "",
    "## By Department",
    "",
  ];

  if (summary.departments.length === 0) {
    lines.push("_No data_");
  } else {
    lines.push("| Department | Time | Sessions |");
    lines.push("|------------|------|----------|");
    for (const dept of summary.departments) {
      lines.push(`| ${dept.name} | ${formatMinutes(dept.minutes)} | ${dept.count} |`);
    }
  }

  if (summary.projects.length > 0) {
    lines.push("", "## By Project", "");
    lines.push("| Project | Time | Sessions |");
    lines.push("|---------|------|----------|");
    for (const proj of summary.projects) {
      const label = proj.code ? `${proj.code} — ${proj.name}` : proj.name;
      lines.push(`| ${label} | ${formatMinutes(proj.minutes)} | ${proj.count} |`);
    }
  }

  lines.push("", "## Sessions", "");

  if (sessions.length === 0) {
    lines.push("_No sessions in this period._");
  } else {
    lines.push("| Date | Time | Dept | Project | Duration | Title | Status | Notes |");
    lines.push("|------|------|------|---------|----------|-------|--------|-------|");

    for (const s of sessions) {
      const proj = s.projects as unknown as { code: string | null; name: string } | null;
      const projName = proj?.code ?? proj?.name ?? "";
      const deptName = (s.departments as unknown as { name: string } | null)?.name ?? "";
      const displayTitle = s.status === "completed_no" && s.actual_title
        ? `~~${s.planned_title}~~ → ${s.actual_title}`
        : s.planned_title;
      const notes = s.notes ? s.notes.replace(/\|/g, "\\|").replace(/\n/g, " ") : "";

      lines.push(
        `| ${formatDateTZ(s.started_at)} | ${formatTimeTZ(s.started_at)} | ${deptName} | ${projName} | ${s.duration_minutes}m | ${displayTitle} | ${statusText(s.status)} | ${notes} |`
      );
    }
  }

  lines.push("", `---`, `_Exported from nuva Focus Timer_`, "");

  const md = lines.join("\n");
  const filename = `nuva-summary-${start.replace(/-/g, "")}-${end.replace(/-/g, "")}.md`;

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(md);
}));

// ─── JSON Export ────────────────────────────

router.get("/sessions.json", validateDateParams, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessions, error } = await fetchFilteredSessions(userId, req.query as Record<string, unknown>);

  if (error) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error } });
    return;
  }

  const start = req.query.start as string;
  const end = req.query.end as string;
  const summary = buildSummary(sessions);

  const payload = {
    meta: {
      exported_at: new Date().toISOString(),
      period: { start, end },
      title: `nuva Report — ${buildTitle(start, end)}`,
    },
    summary: {
      total_minutes: summary.totalMinutes,
      session_count: summary.sessionCount,
      avg_minutes: summary.sessionCount > 0
        ? Math.round(summary.totalMinutes / summary.sessionCount)
        : 0,
      by_department: summary.departments.map((d) => ({
        name: d.name,
        total_minutes: d.minutes,
        session_count: d.count,
      })),
      by_project: summary.projects.map((p) => ({
        code: p.code,
        name: p.name,
        total_minutes: p.minutes,
        session_count: p.count,
      })),
    },
    sessions: sessions.map((s) => {
      const proj = s.projects as unknown as { code: string | null; name: string } | null;
      const dept = s.departments as unknown as { name: string } | null;
      return {
        date: formatDateTZ(s.started_at),
        started_at: s.started_at,
        ended_at: s.ended_at,
        canceled_at: s.canceled_at,
        elapsed_seconds: s.elapsed_seconds,
        duration_minutes: s.duration_minutes,
        department: dept?.name ?? null,
        project: proj?.code ? `${proj.code} — ${proj.name}` : proj?.name ?? null,
        status: statusText(s.status),
        planned_title: s.planned_title,
        actual_title: s.actual_title,
        notes: s.notes,
      };
    }),
  };

  const filename = `nuva-sessions-${start.replace(/-/g, "")}-${end.replace(/-/g, "")}.json`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
}));

export default router;
