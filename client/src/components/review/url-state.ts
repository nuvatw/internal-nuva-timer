import type { Filters } from "../FilterBar";

export const DEFAULT_FILTERS: Filters = { departmentId: "", projectId: "", status: "", durationMinutes: "", q: "" };

export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    departmentId: params.get("dept") ?? "",
    projectId: params.get("proj") ?? "",
    status: params.get("status") ?? "",
    durationMinutes: params.get("dur") ?? "",
    q: params.get("q") ?? "",
  };
}

export function filtersToParams(filters: Filters, params: URLSearchParams): void {
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

export function buildQueryParams(start: string, end: string, filters: Filters): string {
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
