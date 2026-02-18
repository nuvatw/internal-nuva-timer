import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

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
  q: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchInput, setSearchInput] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<Department[]>("/departments").then(setDepartments);
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  // Sync external q changes into local input
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

  const selectCls =
    "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none";

  return (
    <div className="space-y-2">
      {/* Dropdowns row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.departmentId}
          onChange={(e) => onChange({ ...filters, departmentId: e.target.value })}
          className={selectCls}
          aria-label="Filter by department"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={filters.projectId}
          onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
          className={selectCls}
          aria-label="Filter by project"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} — ` : ""}{p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className={selectCls}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="completed_yes">Completed</option>
          <option value="completed_no">Changed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search titles & notes..."
          className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          aria-label="Search sessions"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput("");
              onChange({ ...filters, q: "" });
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
