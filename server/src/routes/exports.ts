import { Router, Request, Response } from "express";
import Papa from "papaparse";
import { supabase } from "../supabase.js";

const router = Router();

// ─── Shared: fetch sessions with filters ───

interface SessionRow {
  started_at: string;
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
  const { start, end, department_id, project_id, status, q } = query;

  if (!start || !end) {
    return { sessions: [], error: "start and end query params are required" };
  }

  let dbQuery = supabase
    .from("sessions")
    .select("started_at, duration_minutes, status, planned_title, actual_title, notes, department_id, departments(name), projects(code, name)")
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
  if (q) {
    const keyword = `%${q}%`;
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

function buildSummary(sessions: SessionRow[]) {
  let totalMinutes = 0;
  let sessionCount = 0;
  const byDept = new Map<string, { name: string; minutes: number; count: number }>();

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
  }

  const departments = Array.from(byDept.values()).sort((a, b) => b.minutes - a.minutes);
  return { totalMinutes, sessionCount, departments };
}

// Week number anchored at Week 1 = Feb 2, 2026 (Monday)
const WEEK1_START = new Date("2026-02-02T00:00:00+08:00");

function getWeekNumber(ymd: string): number {
  const d = new Date(`${ymd}T00:00:00+08:00`);
  const diffMs = d.getTime() - WEEK1_START.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

// ─── CSV Export ─────────────────────────────

router.get("/sessions.csv", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessions, error } = await fetchFilteredSessions(userId, req.query as Record<string, unknown>);

  if (error) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error } });
    return;
  }

  const summary = buildSummary(sessions);

  // Build CSV rows
  const rows: Record<string, string>[] = [];

  // Summary header rows
  rows.push({ Date: "# Summary", Time: "", Department: "", Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });
  rows.push({ Date: "Total Time", Time: formatMinutes(summary.totalMinutes), Department: "", Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });
  rows.push({ Date: "Total Sessions", Time: String(summary.sessionCount), Department: "", Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });

  for (const dept of summary.departments) {
    rows.push({ Date: dept.name, Time: formatMinutes(dept.minutes), Department: `${dept.count} sessions`, Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });
  }

  rows.push({ Date: "", Time: "", Department: "", Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });
  rows.push({ Date: "# Sessions", Time: "", Department: "", Project: "", "Duration (min)": "", Status: "", "Planned Title": "", "Actual Title": "", Notes: "" });

  // Session rows
  for (const s of sessions) {
    const proj = s.projects as unknown as { code: string | null; name: string } | null;
    rows.push({
      Date: formatDateTZ(s.started_at),
      Time: formatTimeTZ(s.started_at),
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
});

// ─── Markdown Export ────────────────────────

router.get("/summary.md", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessions, error } = await fetchFilteredSessions(userId, req.query as Record<string, unknown>);

  if (error) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error } });
    return;
  }

  const start = req.query.start as string;
  const end = req.query.end as string;
  const summary = buildSummary(sessions);

  const weekNum = getWeekNumber(start);
  const weekEnd = getWeekNumber(end);

  // Title
  let title: string;
  if (weekNum > 0 && weekNum === weekEnd) {
    title = `# nuva Weekly Report — Week ${weekNum} (${start} – ${end})`;
  } else if (weekNum > 0 && weekEnd > 0 && weekNum !== weekEnd) {
    title = `# nuva Report — Week ${weekNum}–${weekEnd} (${start} – ${end})`;
  } else {
    title = `# nuva Report — ${start} – ${end}`;
  }

  const lines: string[] = [
    title,
    "",
    "## Summary",
    `- **Total:** ${formatMinutes(summary.totalMinutes)}`,
    `- **Sessions:** ${summary.sessionCount}`,
    "",
    "## By Department",
  ];

  if (summary.departments.length === 0) {
    lines.push("- No data");
  } else {
    for (const dept of summary.departments) {
      lines.push(`- ${dept.name}: ${formatMinutes(dept.minutes)} (${dept.count} sessions)`);
    }
  }

  lines.push("", "## Sessions", "");

  if (sessions.length === 0) {
    lines.push("No sessions in this period.");
  } else {
    lines.push("| Time | Dept | Project | Duration | Title | Status |");
    lines.push("|------|------|---------|----------|-------|--------|");

    for (const s of sessions) {
      const proj = s.projects as unknown as { code: string | null; name: string } | null;
      const projName = proj?.code ?? proj?.name ?? "";
      const deptName = (s.departments as unknown as { name: string } | null)?.name ?? "";
      const displayTitle = s.status === "completed_no" && s.actual_title
        ? s.actual_title
        : s.planned_title;

      lines.push(
        `| ${formatDateTZ(s.started_at)} ${formatTimeTZ(s.started_at)} | ${deptName} | ${projName} | ${s.duration_minutes}m | ${displayTitle} | ${statusText(s.status)} |`
      );
    }
  }

  lines.push("");

  const md = lines.join("\n");
  const filename = `nuva-summary-${start.replace(/-/g, "")}-${end.replace(/-/g, "")}.md`;

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(md);
});

export default router;
