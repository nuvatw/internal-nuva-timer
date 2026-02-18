import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";
import { api } from "../lib/api";

const EMOJI_OPTIONS = [
  "😊", "🚀", "🎯", "💡", "🔥", "🌟", "📚", "💪",
  "🧠", "🎨", "🌱", "⚡", "🏆", "🎵", "🐱", "☕",
];

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

// ─── Profile Section ───────────────────────

function ProfileSection() {
  const { profile, refresh } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setEmoji(profile.avatar_emoji || "🎯");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await api.patch("/me", {
        display_name: displayName.trim(),
        avatar_emoji: emoji,
      });
      await refresh();
      setMessage("Saved!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        Profile
      </h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="settings-name" className="block text-sm text-gray-600 mb-1">
            Display Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Avatar</label>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-expanded={showEmojiPicker}
            aria-label="Change avatar emoji"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-gray-400">Click to change</span>
          </button>
          {showEmojiPicker && (
            <div className="mt-2 grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Avatar emoji">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={emoji === e}
                  aria-label={`Emoji ${e}`}
                  onClick={() => {
                    setEmoji(e);
                    setShowEmojiPicker(false);
                  }}
                  className={`flex items-center justify-center h-9 w-9 rounded-lg text-lg transition-all ${
                    emoji === e
                      ? "bg-indigo-100 ring-2 ring-indigo-500"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {message && (
            <span className="text-sm text-green-600">{message}</span>
          )}
        </div>
      </div>
    </section>
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
      setNewName("");
      await fetchDepartments();
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/departments/${id}`, { name: editName.trim() });
      setEditingId(null);
      await fetchDepartments();
    } catch { /* ignore */ }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await api.post(`/departments/${id}/archive`, { is_archived: archive });
      await fetchDepartments();
    } catch { /* ignore */ }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Departments
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded"
          />
          Show archived
        </label>
      </div>

      <ul className="space-y-2">
        {departments.map((dept) => (
          <li
            key={dept.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              dept.is_archived
                ? "border-gray-200 bg-gray-50 text-gray-400"
                : "border-gray-200 bg-white"
            }`}
          >
            {editingId === dept.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(dept.id)}
                  autoFocus
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => handleRename(dept.id)}
                  className="text-xs text-indigo-600 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span>{dept.name}</span>
                <div className="flex items-center gap-2">
                  {!dept.is_archived && (
                    <button
                      onClick={() => {
                        setEditingId(dept.id);
                        setEditName(dept.name);
                      }}
                      className="text-xs text-gray-500 hover:text-indigo-600"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(dept.id, !dept.is_archived)}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    {dept.is_archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Add new */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New department name"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          + Add
        </button>
      </div>
    </section>
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
      setNewName("");
      setNewCode("");
      await fetchProjects();
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/projects/${id}`, {
        name: editName.trim(),
        code: editCode.trim() || null,
      });
      setEditingId(null);
      await fetchProjects();
    } catch { /* ignore */ }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await api.post(`/projects/${id}/archive`, { is_archived: archive });
      await fetchProjects();
    } catch { /* ignore */ }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Projects
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded"
          />
          Show archived
        </label>
      </div>

      <ul className="space-y-2">
        {projects.map((proj) => (
          <li
            key={proj.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              proj.is_archived
                ? "border-gray-200 bg-gray-50 text-gray-400"
                : "border-gray-200 bg-white"
            }`}
          >
            {editingId === proj.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Code"
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(proj.id)}
                  autoFocus
                  placeholder="Name"
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => handleRename(proj.id)}
                  className="text-xs text-indigo-600 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span>
                  {proj.code && (
                    <span className="text-gray-400 mr-1">{proj.code}</span>
                  )}
                  {proj.name}
                </span>
                <div className="flex items-center gap-2">
                  {!proj.is_archived && (
                    <button
                      onClick={() => {
                        setEditingId(proj.id);
                        setEditCode(proj.code || "");
                        setEditName(proj.name);
                      }}
                      className="text-xs text-gray-500 hover:text-indigo-600"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleArchive(proj.id, !proj.is_archived)}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    {proj.is_archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Add new */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code"
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Project name"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          + Add
        </button>
      </div>
    </section>
  );
}

// ─── Settings Page ─────────────────────────

export default function SettingsPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="p-6 space-y-8">
      <ProfileSection />

      <div className="border-t border-gray-200" />

      <DepartmentsSection />

      <div className="border-t border-gray-200" />

      <ProjectsSection />

      <div className="border-t border-gray-200" />

      <section>
        <p className="text-sm text-gray-500 mb-3">
          Signed in as {user?.email}
        </p>
        <button
          onClick={signOut}
          className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Sign Out
        </button>
      </section>
    </div>
  );
}
