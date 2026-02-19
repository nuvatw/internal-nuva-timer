import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  ChevronDown,
  Briefcase,
  FolderOpen,
  CheckCircle2,
  Clock,
  Bookmark,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";

// ─── Types ───────────────────────────────────

interface Department {
  id: string;
  name: string;
}

interface Project {
  id: string;
  code: string | null;
  name: string;
}

export interface Filters {
  departmentId: string;
  projectId: string;
  status: string;
  durationMinutes: string;
  q: string;
}

interface SavedPreset {
  id: string;
  name: string;
  filters: Omit<Filters, "q">;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

// ─── Constants ───────────────────────────────

const PRESETS_KEY = "nuva-filter-presets";

const STATUS_OPTIONS = [
  { value: "completed_yes", label: "Completed" },
  { value: "completed_no", label: "Changed" },
  { value: "canceled", label: "Canceled" },
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "60 min" },
];

// ─── Popover Dropdown ────────────────────────

function FilterDropdown({
  label,
  icon: Icon,
  value,
  children,
  isActive,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  children: React.ReactNode;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "border-accent bg-accent-muted text-accent"
            : "border-border bg-bg text-text-secondary hover:bg-surface-raised"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Filter by ${label}`}
      >
        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
        <span className="max-w-[120px] truncate">{value || label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-bg shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Searchable List ─────────────────────────

function SearchableList({
  items,
  selected,
  allLabel,
  onSelect,
  renderItem,
}: {
  items: { id: string }[];
  selected: string;
  allLabel: string;
  onSelect: (id: string) => void;
  renderItem: (item: { id: string }) => React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = search
    ? items.filter((item) => {
        const text = JSON.stringify(item).toLowerCase();
        return text.includes(search.toLowerCase());
      })
    : items;

  return (
    <div>
      {items.length > 5 && (
        <div className="p-2 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
          />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto py-1" role="listbox">
        <button
          role="option"
          aria-selected={!selected}
          onClick={() => onSelect("")}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
            !selected
              ? "bg-accent-muted text-accent font-medium"
              : "text-text-secondary hover:bg-surface-raised"
          }`}
        >
          {allLabel}
        </button>
        {filtered.map((item) => (
          <button
            key={item.id}
            role="option"
            aria-selected={selected === item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
              selected === item.id
                ? "bg-accent-muted text-accent font-medium"
                : "text-text-secondary hover:bg-surface-raised"
            }`}
          >
            {renderItem(item)}
          </button>
        ))}
        {filtered.length === 0 && search && (
          <p className="px-3 py-2 text-xs text-text-tertiary">No matches</p>
        )}
      </div>
    </div>
  );
}

// ─── Simple Option List ──────────────────────

function OptionList({
  options,
  selected,
  allLabel,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  allLabel: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="py-1" role="listbox">
      <button
        role="option"
        aria-selected={!selected}
        onClick={() => onSelect("")}
        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
          !selected
            ? "bg-accent-muted text-accent font-medium"
            : "text-text-secondary hover:bg-surface-raised"
        }`}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          role="option"
          aria-selected={selected === opt.value}
          onClick={() => onSelect(opt.value)}
          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
            selected === opt.value
              ? "bg-accent-muted text-accent font-medium"
              : "text-text-secondary hover:bg-surface-raised"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Active Filter Chip ──────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 rounded-md bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent"
    >
      {label}
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-accent/10 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </motion.span>
  );
}

// ─── Preset Manager ──────────────────────────

function loadPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: SavedPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

// ─── FilterBar ───────────────────────────────

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchInput, setSearchInput] = useState(filters.q);
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<Department[]>("/departments").then(setDepartments);
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, q: value });
    }, 300);
  };

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: SavedPreset = {
      id: crypto.randomUUID(),
      name: presetName.trim(),
      filters: {
        departmentId: filters.departmentId,
        projectId: filters.projectId,
        status: filters.status,
        durationMinutes: filters.durationMinutes,
      },
    };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
    setShowPresetInput(false);
  }, [presetName, filters, presets]);

  const handleLoadPreset = useCallback(
    (preset: SavedPreset) => {
      onChange({ ...filters, ...preset.filters });
    },
    [filters, onChange],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      savePresets(updated);
    },
    [presets],
  );

  // Resolve display names
  const deptName = departments.find((d) => d.id === filters.departmentId)?.name;
  const projItem = projects.find((p) => p.id === filters.projectId);
  const projName = projItem
    ? projItem.code
      ? `${projItem.code} ${projItem.name}`
      : projItem.name
    : undefined;
  const statusName = STATUS_OPTIONS.find((o) => o.value === filters.status)?.label;
  const durationName = DURATION_OPTIONS.find((o) => o.value === filters.durationMinutes)?.label;

  // Memoized change handlers
  const onDeptChange = useCallback((id: string) => onChange({ ...filters, departmentId: id }), [filters, onChange]);
  const onProjChange = useCallback((id: string) => onChange({ ...filters, projectId: id }), [filters, onChange]);
  const onStatusChange = useCallback((v: string) => onChange({ ...filters, status: v }), [filters, onChange]);
  const onDurationChange = useCallback((v: string) => onChange({ ...filters, durationMinutes: v }), [filters, onChange]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.departmentId && deptName)
      chips.push({
        key: "dept",
        label: deptName,
        clear: () => onChange({ ...filters, departmentId: "" }),
      });
    if (filters.projectId && projName)
      chips.push({
        key: "proj",
        label: projName,
        clear: () => onChange({ ...filters, projectId: "" }),
      });
    if (filters.status && statusName)
      chips.push({
        key: "status",
        label: statusName,
        clear: () => onChange({ ...filters, status: "" }),
      });
    if (filters.durationMinutes && durationName)
      chips.push({
        key: "duration",
        label: durationName,
        clear: () => onChange({ ...filters, durationMinutes: "" }),
      });
    return chips;
  }, [filters, onChange, deptName, projName, statusName, durationName]);

  const hasFiltersActive = activeChips.length > 0;

  return (
    <div className="space-y-2">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search titles & notes..."
            className="w-full rounded-lg border border-border bg-bg pl-8 pr-8 py-1.5 text-xs text-text-primary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none"
            aria-label="Search sessions"
          />
          <Search
            size={13}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                onChange({ ...filters, q: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Department dropdown */}
        <FilterDropdown
          label="Department"
          icon={Briefcase}
          value={deptName || "Department"}
          isActive={!!filters.departmentId}
        >
          <SearchableList
            items={departments}
            selected={filters.departmentId}
            allLabel="All Departments"
            onSelect={onDeptChange}
            renderItem={(item) => (item as Department).name}
          />
        </FilterDropdown>

        {/* Project dropdown */}
        <FilterDropdown
          label="Project"
          icon={FolderOpen}
          value={projName || "Project"}
          isActive={!!filters.projectId}
        >
          <SearchableList
            items={projects}
            selected={filters.projectId}
            allLabel="All Projects"
            onSelect={onProjChange}
            renderItem={(item) => {
              const p = item as Project;
              return p.code ? `${p.code} — ${p.name}` : p.name;
            }}
          />
        </FilterDropdown>

        {/* Status dropdown */}
        <FilterDropdown
          label="Status"
          icon={CheckCircle2}
          value={statusName || "Status"}
          isActive={!!filters.status}
        >
          <OptionList
            options={STATUS_OPTIONS}
            selected={filters.status}
            allLabel="All Statuses"
            onSelect={onStatusChange}
          />
        </FilterDropdown>

        {/* Duration dropdown */}
        <FilterDropdown
          label="Duration"
          icon={Clock}
          value={durationName || "Duration"}
          isActive={!!filters.durationMinutes}
        >
          <OptionList
            options={DURATION_OPTIONS}
            selected={filters.durationMinutes}
            allLabel="All Durations"
            onSelect={onDurationChange}
          />
        </FilterDropdown>

        {/* Presets dropdown */}
        <FilterDropdown
          label="Presets"
          icon={Bookmark}
          value="Presets"
          isActive={false}
        >
          <div className="py-1">
            {presets.length === 0 && !showPresetInput && (
              <p className="px-3 py-2 text-xs text-text-tertiary">
                No saved presets
              </p>
            )}
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-surface-raised group"
              >
                <button
                  onClick={() => handleLoadPreset(preset)}
                  className="flex-1 text-left text-xs text-text-secondary hover:text-text-primary truncate"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-tertiary hover:text-destructive transition-all"
                  aria-label={`Delete ${preset.name}`}
                >
                  <Trash2 size={11} strokeWidth={2} />
                </button>
              </div>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              {showPresetInput ? (
                <div className="px-3 py-1.5 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePreset();
                      if (e.key === "Escape") setShowPresetInput(false);
                    }}
                    placeholder="Preset name..."
                    maxLength={30}
                    autoFocus
                    className="flex-1 min-w-0 rounded border border-border bg-bg px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="rounded bg-accent px-2 py-1 text-xs font-medium text-text-inverted disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPresetInput(true)}
                  disabled={!hasFiltersActive}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent hover:bg-surface-raised disabled:text-text-tertiary disabled:hover:bg-transparent transition-colors"
                >
                  <Plus size={12} strokeWidth={2} />
                  Save current filters
                </button>
              )}
            </div>
          </div>
        </FilterDropdown>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            className="flex flex-wrap items-center gap-1.5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider mr-1">
              Active:
            </span>
            <AnimatePresence mode="popLayout">
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  onRemove={chip.clear}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
