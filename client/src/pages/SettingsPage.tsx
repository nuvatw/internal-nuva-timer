import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";
import { toast } from "../contexts/ToastContext";
import {
  User,
  Building2,
  FolderKanban,
  LogOut,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Check,
  X,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { api } from "../lib/api";
import {
  AVATAR_ICONS,
  DEFAULT_AVATAR_ICON,
  getAvatarIcon,
} from "../lib/avatar-icons";
import { listVariants, listItemVariants } from "../lib/motion";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// ─── Types ─────────────────────────────────

interface Department {
  id: string;
  name: string;
  is_archived: boolean;
}

interface Project {
  id: string;
  code: string | null;
  name: string;
  is_archived: boolean;
}

// ─── Card Shell ────────────────────────────

function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      className="rounded-xl border border-border bg-bg overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-accent-muted flex items-center justify-center text-accent shrink-0">
            <Icon size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {description && (
              <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </motion.section>
  );
}

// ─── Profile Section ───────────────────────

function ProfileSection() {
  const { profile, refresh } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_AVATAR_ICON);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setSelectedIcon(profile.avatar_emoji || DEFAULT_AVATAR_ICON);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await api.patch("/me", {
        display_name: displayName.trim(),
        avatar_emoji: selectedIcon,
      });
      await refresh();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const CurrentIcon = getAvatarIcon(selectedIcon);

  return (
    <SettingsCard
      icon={User}
      title="Profile"
      description="Your display name and avatar"
    >
      <div className="space-y-4">
        {/* Avatar + Name row */}
        <div className="flex items-start gap-4">
          {/* Avatar picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              aria-expanded={showIconPicker}
              aria-label="Change avatar icon"
              className="h-14 w-14 rounded-xl bg-accent-muted flex items-center justify-center text-accent hover:ring-2 hover:ring-accent/30 transition-all"
            >
              <CurrentIcon size={24} strokeWidth={1.75} />
            </button>
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-surface-raised border border-border flex items-center justify-center">
              <Pencil size={10} strokeWidth={2} className="text-text-tertiary" />
            </span>
          </div>

          {/* Name input */}
          <div className="flex-1">
            <label htmlFor="settings-name" className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
            />
          </div>
        </div>

        {/* Icon picker grid */}
        <AnimatePresence>
          {showIconPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Choose avatar
                </p>
                <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Avatar icon">
                  {AVATAR_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={selectedIcon === name}
                      aria-label={name}
                      onClick={() => {
                        setSelectedIcon(name);
                        setShowIconPicker(false);
                      }}
                      className={`flex items-center justify-center h-9 w-9 rounded-lg transition-all ${
                        selectedIcon === name
                          ? "bg-accent-muted ring-2 ring-accent text-accent"
                          : "bg-bg hover:bg-surface-raised text-text-secondary"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ─── Inline Edit Row ──────────────────────

function InlineEditRow({
  editing,
  name,
  code,
  isArchived,
  editName,
  editCode,
  onEditNameChange,
  onEditCodeChange,
  onSave,
  onCancel,
  onStartEdit,
  onArchive,
  showCode,
}: {
  editing: boolean;
  name: string;
  code?: string | null;
  isArchived: boolean;
  editName: string;
  editCode?: string;
  onEditNameChange: (v: string) => void;
  onEditCodeChange?: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onArchive: () => void;
  showCode?: boolean;
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        {showCode && (
          <input
            type="text"
            value={editCode}
            onChange={(e) => onEditCodeChange?.(e.target.value)}
            placeholder="Code"
            className="w-16 rounded-md border border-border bg-bg px-2 py-1 text-sm focus:border-accent outline-none transition-colors"
          />
        )}
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          autoFocus
          placeholder="Name"
          className="flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm focus:border-accent outline-none transition-colors"
        />
        <button
          onClick={onSave}
          className="p-1 rounded text-success hover:bg-success-muted transition-colors"
          aria-label="Save"
        >
          <Check size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onCancel}
          className="p-1 rounded text-text-tertiary hover:text-text-secondary hover:bg-surface transition-colors"
          aria-label="Cancel"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`text-sm truncate ${isArchived ? "text-text-tertiary" : "text-text-primary"}`}>
          {code && (
            <span className="text-text-tertiary font-mono text-xs mr-1.5">{code}</span>
          )}
          {name}
        </span>
        {isArchived && (
          <span className="shrink-0 text-[10px] font-medium text-text-tertiary bg-surface-raised rounded px-1.5 py-0.5">
            Archived
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {!isArchived && (
          <button
            onClick={onStartEdit}
            className="p-1.5 rounded-md text-text-tertiary hover:text-accent hover:bg-accent-muted transition-colors"
            aria-label={`Edit ${name}`}
          >
            <Pencil size={13} strokeWidth={1.75} />
          </button>
        )}
        <button
          onClick={onArchive}
          className="p-1.5 rounded-md text-text-tertiary hover:text-warning hover:bg-warning-muted transition-colors"
          aria-label={isArchived ? `Restore ${name}` : `Archive ${name}`}
        >
          {isArchived ? (
            <ArchiveRestore size={13} strokeWidth={1.75} />
          ) : (
            <Archive size={13} strokeWidth={1.75} />
          )}
        </button>
      </div>
    </>
  );
}

// ─── Departments Section ───────────────────

function DepartmentsSection() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchDepartments = useCallback(async () => {
    const data = await api.get<Department[]>(
      `/departments?include_archived=${showArchived}`
    );
    setDepartments(data);
  }, [showArchived]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post("/departments", { name: newName.trim() });
      toast.success(`Department "${newName.trim()}" added`);
      setNewName("");
      await fetchDepartments();
    } catch {
      toast.error("Failed to add department");
    }
    setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/departments/${id}`, { name: editName.trim() });
      toast.success("Department renamed");
      setEditingId(null);
      await fetchDepartments();
    } catch {
      toast.error("Failed to rename department");
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await api.post(`/departments/${id}/archive`, { is_archived: archive });
      toast.success(archive ? "Department archived" : "Department restored");
      await fetchDepartments();
    } catch {
      toast.error(archive ? "Failed to archive" : "Failed to restore");
    }
  };

  const archiveToggle = (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
        className="rounded border-border text-accent focus:ring-accent"
      />
      <span className="text-xs text-text-tertiary">Show archived</span>
    </label>
  );

  return (
    <SettingsCard
      icon={Building2}
      title="Departments"
      description="Organize sessions by team or department"
      action={archiveToggle}
    >
      <div className="space-y-3">
        {departments.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">
            No departments yet
          </p>
        ) : (
          <motion.ul className="space-y-1" variants={listVariants} initial="initial" animate="animate">
            {departments.map((dept) => (
              <motion.li
                key={dept.id}
                variants={listItemVariants}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                  dept.is_archived
                    ? "bg-surface"
                    : "bg-surface-raised hover:bg-surface"
                }`}
              >
                <InlineEditRow
                  editing={editingId === dept.id}
                  name={dept.name}
                  isArchived={dept.is_archived}
                  editName={editName}
                  onEditNameChange={setEditName}
                  onSave={() => handleRename(dept.id)}
                  onCancel={() => setEditingId(null)}
                  onStartEdit={() => {
                    setEditingId(dept.id);
                    setEditName(dept.name);
                  }}
                  onArchive={() => handleArchive(dept.id, !dept.is_archived)}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New department name"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Add
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ─── Projects Section ──────────────────────

function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchProjects = useCallback(async () => {
    const data = await api.get<Project[]>(
      `/projects?include_archived=${showArchived}`
    );
    setProjects(data);
  }, [showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post("/projects", {
        name: newName.trim(),
        code: newCode.trim() || undefined,
      });
      toast.success(`Project "${newName.trim()}" added`);
      setNewName("");
      setNewCode("");
      await fetchProjects();
    } catch {
      toast.error("Failed to add project");
    }
    setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/projects/${id}`, {
        name: editName.trim(),
        code: editCode.trim() || null,
      });
      toast.success("Project updated");
      setEditingId(null);
      await fetchProjects();
    } catch {
      toast.error("Failed to update project");
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await api.post(`/projects/${id}/archive`, { is_archived: archive });
      toast.success(archive ? "Project archived" : "Project restored");
      await fetchProjects();
    } catch {
      toast.error(archive ? "Failed to archive" : "Failed to restore");
    }
  };

  const archiveToggle = (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={showArchived}
        onChange={(e) => setShowArchived(e.target.checked)}
        className="rounded border-border text-accent focus:ring-accent"
      />
      <span className="text-xs text-text-tertiary">Show archived</span>
    </label>
  );

  return (
    <SettingsCard
      icon={FolderKanban}
      title="Projects"
      description="Track work by project with optional codes"
      action={archiveToggle}
    >
      <div className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-4">
            No projects yet
          </p>
        ) : (
          <motion.ul className="space-y-1" variants={listVariants} initial="initial" animate="animate">
            {projects.map((proj) => (
              <motion.li
                key={proj.id}
                variants={listItemVariants}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                  proj.is_archived
                    ? "bg-surface"
                    : "bg-surface-raised hover:bg-surface"
                }`}
              >
                <InlineEditRow
                  editing={editingId === proj.id}
                  name={proj.name}
                  code={proj.code}
                  isArchived={proj.is_archived}
                  editName={editName}
                  editCode={editCode}
                  onEditNameChange={setEditName}
                  onEditCodeChange={setEditCode}
                  onSave={() => handleRename(proj.id)}
                  onCancel={() => setEditingId(null)}
                  onStartEdit={() => {
                    setEditingId(proj.id);
                    setEditCode(proj.code || "");
                    setEditName(proj.name);
                  }}
                  onArchive={() => handleArchive(proj.id, !proj.is_archived)}
                  showCode
                />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {/* Add new */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code"
            className="w-20 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Project name"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Add
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ─── Account Section ──────────────────────

function AccountSection() {
  const { user, signOut } = useAuth();

  return (
    <motion.section
      className="rounded-xl border border-border bg-bg overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-surface-raised flex items-center justify-center text-text-tertiary shrink-0">
          <Mail size={16} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">Account</h3>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive-muted hover:border-destructive transition-colors"
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </motion.section>
  );
}

// ─── Settings Page ─────────────────────────

export default function SettingsPage() {
  useDocumentTitle("Settings");
  return (
    <div className="p-6 sm:p-8 space-y-5 max-w-2xl">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Settings</h2>
        <p className="text-sm text-text-tertiary mt-1">
          Manage your profile, departments, and projects
        </p>
      </div>

      <ProfileSection />
      <DepartmentsSection />
      <ProjectsSection />
      <AccountSection />
    </div>
  );
}
