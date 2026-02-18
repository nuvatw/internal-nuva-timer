import { supabase } from "./supabase";

const API_BASE = "/api";
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handle401(): never {
  // Clear auth state and redirect to login
  supabase.auth.signOut();
  window.location.href = "/login";
  throw new Error("Session expired — please log in again");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (res.status === 401) handle401();

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.error?.message || `Request failed: ${res.status}`);

        // Retry on server errors / rate limits
        if (isRetryable(res.status) && attempt < MAX_RETRIES) {
          lastError = err;
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }

        throw err;
      }

      return res.json();
    } catch (err) {
      // Network error (offline, DNS failure, etc.)
      if (err instanceof TypeError && err.message.includes("fetch")) {
        lastError = new Error("Network error — check your connection");
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
          continue;
        }
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

async function download(path: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });

  if (res.status === 401) handle401();

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Download failed: ${res.status}`);
  }

  // Extract filename from Content-Disposition header
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "download";

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  download,
};
