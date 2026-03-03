import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  X,
  Clock,
  Calendar,
  Briefcase,
  FolderOpen,
  FileText,
  Pencil,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api";
import { formatTime, formatTimeRange, formatFullDate, formatMinutes, toYMD, plannedEndIso } from "../lib/dates";
import { toast } from "../contexts/ToastContext";
import { tapScale } from "../lib/motion";
import type { Department, Project, Session } from "../types/models";

interface SessionDetailPanelProps {
  session: Session | null;
  onClose: () => void;
  onUpdated: (updated?: Session) => void;
}

// ─── Status Helpers ────────────────────────

function statusBadge(status: string) {
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

// ─── Detail Row ────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 h-8 w-8 rounded-lg bg-surface-raised flex items-center justify-center shrink-0">
        <Icon size={15} strokeWidth={1.75} className="text-text-tertiary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="text-sm text-text-primary">{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────

/** Extract "YYYY-MM-DD" from an ISO string */
function isoToDateInput(iso: string): string {
  return toYMD(new Date(iso));
}

// ─── Panel ─────────────────────────────────

export default function SessionDetailPanel({
  session,
  onClose,
  onUpdated,
}: SessionDetailPanelProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(!!session);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editDeptId, setEditDeptId] = useState("");
  const [editProjId, setEditProjId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDuration, setEditDuration] = useState(30);
  const [editNotes, setEditNotes] = useState("");

  // Reset state when session changes
  useEffect(() => {
    if (session) {
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [session]);

  // Populate edit form when entering edit mode
  const enterEdit = useCallback(() => {
    if (!session) return;
    setEditDeptId(session.department_id);
    setEditProjId(session.project_id);
    setEditDate(isoToDateInput(session.started_at));
    setEditStartTime(formatTime(session.started_at));
    setEditEndTime(formatTime(plannedEndIso(session.started_at, session.duration_minutes)));
    setEditDuration(session.duration_minutes);
    setEditNotes(session.notes ?? "");

    // Fetch reference data
    if (departments.length === 0) {
      api.get<Department[]>("/departments").then(setDepartments);
    }
    if (projects.length === 0) {
      api.get<Project[]>("/projects").then(setProjects);
    }

    setEditing(true);
  }, [session, departments.length, projects.length]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) cancelEdit();
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [session, editing, onClose, cancelEdit]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    setSaving(true);
    try {
      const started_at = `${editDate}T${editStartTime}:00+08:00`;
      const ended_at = `${editDate}T${editEndTime}:00+08:00`;

      const updated = await api.patch<Session>(`/sessions/${session.id}`, {
        department_id: editDeptId,
        project_id: editProjId,
        started_at,
        ended_at,
        duration_minutes: editDuration,
        notes: editNotes.trim() || null,
      });
      toast.success("Session updated");
      setEditing(false);
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }, [session, editDeptId, editProjId, editDate, editStartTime, editEndTime, editDuration, editNotes, onUpdated]);

  const handleDelete = useCallback(async () => {
    if (!session) return;
    setDeleting(true);
    try {
      await api.delete(`/sessions/${session.id}`);
      toast.success("Session deleted");
      onClose();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
    setDeleting(false);
  }, [session, onClose, onUpdated]);

  const isFinished = session
    ? ["completed_yes", "completed_no", "canceled"].includes(session.status)
    : false;

  return (
    <AnimatePresence>
      {session && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Session details"
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-bg border-l border-border shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text-primary font-serif">
                Session Details
              </h2>
              <div className="flex items-center gap-1">
                {isFinished && !editing && (
                  <button
                    onClick={enterEdit}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-surface-raised transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil size={16} strokeWidth={2} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                  aria-label="Close"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              {/* Title + Status */}
              <div className="pb-4 border-b border-border-subtle">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-text-primary leading-snug">
                    {session.status === "completed_no" && session.actual_title
                      ? session.actual_title
                      : session.planned_title}
                  </h3>
                  <span
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge(session.status).cls}`}
                  >
                    {statusBadge(session.status).text}
                  </span>
                </div>

                {session.status === "completed_no" && session.actual_title && (
                  <p className="text-sm text-text-tertiary">
                    <span className="text-warning">Planned:</span>{" "}
                    {session.planned_title}
                  </p>
                )}

                {session.status !== "completed_no" &&
                  session.planned_title !== (session.actual_title ?? session.planned_title) && (
                    <p className="text-sm text-text-tertiary mt-1">
                      Planned: {session.planned_title}
                    </p>
                  )}
              </div>

              {editing ? (
                /* ─── Edit Mode ─────────────────── */
                <div className="space-y-4 py-2">
                  {/* Department */}
                  <div>
                    <label className="block label-caps mb-1">Department</label>
                    <select
                      value={editDeptId}
                      onChange={(e) => setEditDeptId(e.target.value)}
                      className="input w-full px-3 py-2"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block label-caps mb-1">Project</label>
                    <select
                      value={editProjId}
                      onChange={(e) => setEditProjId(e.target.value)}
                      className="input w-full px-3 py-2"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `${p.code} — ` : ""}{p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block label-caps mb-1">Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="input w-full px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block label-caps mb-1">Start</label>
                      <input
                        type="time"
                        lang="en-GB"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="input w-full px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block label-caps mb-1">End</label>
                      <input
                        type="time"
                        lang="en-GB"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="input w-full px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block label-caps mb-1">Duration</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                        className="flex-1 accent-accent cursor-pointer"
                      />
                      <span className="text-sm font-medium text-text-primary w-14 text-right tabular-nums">
                        {editDuration} min
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block label-caps mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add session notes..."
                      rows={3}
                      className="input w-full px-3 py-2 resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* ─── View Mode ─────────────────── */
                <>
                  <DetailRow icon={Briefcase} label="Department">
                    {session.departments.name}
                  </DetailRow>

                  <DetailRow icon={FolderOpen} label="Project">
                    {session.projects.code ? (
                      <>
                        <span className="font-mono text-xs bg-surface-raised px-1.5 py-0.5 rounded mr-1.5">
                          {session.projects.code}
                        </span>
                        {session.projects.name}
                      </>
                    ) : (
                      session.projects.name
                    )}
                  </DetailRow>

                  <DetailRow icon={Calendar} label="Time">
                    <div className="space-y-0.5">
                      <p className="font-mono tabular-nums font-semibold font-serif">
                        {formatTimeRange(session.started_at, session.duration_minutes, session.status)}
                      </p>
                      <p className="text-text-secondary text-xs">
                        {formatFullDate(toYMD(new Date(session.started_at)))}
                      </p>
                    </div>
                  </DetailRow>

                  <DetailRow icon={Clock} label="Duration">
                    <div className="space-y-0.5">
                      <span className="font-semibold tabular-nums font-serif">
                        {formatMinutes(session.duration_minutes)} planned
                      </span>
                      {session.elapsed_seconds != null && session.elapsed_seconds > 0 && (
                        <p className="text-text-secondary text-xs">
                          {formatMinutes(Math.floor(session.elapsed_seconds / 60))} focused
                          {session.status === "canceled" && " (canceled)"}
                        </p>
                      )}
                    </div>
                  </DetailRow>

                  {/* Notes (view mode) */}
                  <div className="pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} strokeWidth={1.75} className="text-text-tertiary" />
                      <span className="text-xs text-text-tertiary uppercase tracking-wider">
                        Notes
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${
                        session.notes ? "text-text-secondary" : "text-text-tertiary italic"
                      }`}
                    >
                      {session.notes || "No notes"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border">
              {editing ? (
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    whileTap={tapScale}
                  >
                    <Check size={14} strokeWidth={2} />
                    {saving ? "Saving..." : "Save"}
                  </motion.button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {confirmDelete ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle size={14} strokeWidth={2} />
                        <span className="font-medium">
                          Delete this session permanently?
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                          whileTap={tapScale}
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          {deleting ? "Deleting..." : "Confirm Delete"}
                        </motion.button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="delete"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                      Delete session
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
