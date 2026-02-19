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
import { formatTime, formatFullDate, toYMD } from "../lib/dates";
import { toast } from "../contexts/ToastContext";
import { tapScale } from "../lib/motion";

// ─── Types ─────────────────────────────────

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

interface SessionDetailPanelProps {
  session: Session | null;
  onClose: () => void;
  onUpdated: () => void;
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

// ─── Panel ─────────────────────────────────

export default function SessionDetailPanel({
  session,
  onClose,
  onUpdated,
}: SessionDetailPanelProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(!!session);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset state when session changes
  useEffect(() => {
    if (session) {
      setNotesValue(session.notes ?? "");
      setEditingNotes(false);
      setConfirmDelete(false);
    }
  }, [session]);

  // Close on Escape
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [session, onClose]);

  const handleSaveNotes = useCallback(async () => {
    if (!session) return;
    setSaving(true);
    try {
      await api.patch(`/sessions/${session.id}`, {
        notes: notesValue.trim() || null,
      });
      toast.success("Notes updated");
      setEditingNotes(false);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }, [session, notesValue, onUpdated]);

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
              <h2 className="text-base font-semibold text-text-primary">
                Session Details
              </h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
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

              {/* Details */}
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

              <DetailRow icon={Clock} label="Duration">
                <span className="font-semibold tabular-nums">
                  {session.duration_minutes}m
                </span>
                {session.status === "canceled" &&
                  session.elapsed_seconds != null && (
                    <span className="text-text-tertiary ml-2">
                      (elapsed:{" "}
                      {Math.floor(session.elapsed_seconds / 60)}m{" "}
                      {session.elapsed_seconds % 60}s)
                    </span>
                  )}
              </DetailRow>

              <DetailRow icon={Calendar} label="Time">
                <div className="space-y-0.5">
                  <p>
                    {formatFullDate(toYMD(new Date(session.started_at)))},{" "}
                    <span className="font-mono tabular-nums">
                      {formatTime(session.started_at)}
                    </span>
                  </p>
                  {session.ended_at && (
                    <p className="text-text-secondary">
                      Ended{" "}
                      <span className="font-mono tabular-nums">
                        {formatTime(session.ended_at)}
                      </span>
                    </p>
                  )}
                  {session.canceled_at && (
                    <p className="text-text-secondary">
                      Canceled{" "}
                      <span className="font-mono tabular-nums">
                        {formatTime(session.canceled_at)}
                      </span>
                    </p>
                  )}
                </div>
              </DetailRow>

              {/* Notes */}
              <div className="pt-2 border-t border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={14}
                      strokeWidth={1.75}
                      className="text-text-tertiary"
                    />
                    <span className="text-xs text-text-tertiary uppercase tracking-wider">
                      Notes
                    </span>
                  </div>
                  {isFinished && !editingNotes && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                    >
                      <Pencil size={12} strokeWidth={2} />
                      Edit
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add session notes..."
                      rows={3}
                      autoFocus
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={handleSaveNotes}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
                        whileTap={tapScale}
                      >
                        <Check size={12} strokeWidth={2} />
                        {saving ? "Saving..." : "Save"}
                      </motion.button>
                      <button
                        onClick={() => {
                          setNotesValue(session.notes ?? "");
                          setEditingNotes(false);
                        }}
                        className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`text-sm leading-relaxed ${
                      session.notes
                        ? "text-text-secondary"
                        : "text-text-tertiary italic"
                    }`}
                  >
                    {session.notes || "No notes"}
                  </p>
                )}
              </div>
            </div>

            {/* Footer — Delete action */}
            <div className="px-6 py-4 border-t border-border">
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
