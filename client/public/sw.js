/// <reference lib="webworker" />

const CACHE_NAME = "nuva-v1";

// ─── Install ─────────────────────────────────
// Pre-cache the app shell so the SPA works offline.

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/alarm.mp3"]))
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────
// Clean up old caches when a new SW version takes over.

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── API calls: network-only (no caching) ──
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/exports/")) {
    return;
  }

  // ── Hashed static assets: cache-first ─────
  // Vite produces filenames like /assets/index-abc123.js
  // Safe to cache permanently since hash = content.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── Navigation (HTML pages): network-first ─
  // Fall back to cached / (the SPA shell) when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // ── Other static files (fonts, images, mp3): stale-while-revalidate ─
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
