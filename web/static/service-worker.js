/*
 * zoobidoo (fork-only) — OpenSlate PWA service worker.
 *
 * Goal: make the app installable and give it a basic offline app shell
 * WITHOUT changing any feature/UI behaviour and WITHOUT ever touching the
 * cross-origin API or auth requests. Strategy is intentionally conservative:
 *
 *   - Only same-origin GET requests are ever intercepted.
 *   - Navigations  -> network first, fall back to the cached SPA shell ("/").
 *   - Static assets -> stale-while-revalidate (instant load, refresh in bg).
 *   - Everything else (API calls, POST/PUT/DELETE, cross-origin) -> untouched.
 *
 * Bump CACHE_VERSION to force clients onto a fresh cache.
 */
const CACHE_VERSION = "openslate-pwa-v1";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never interfere with non-GET or cross-origin (e.g. the API) requests.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations: try the network, fall back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(APP_SHELL, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(() =>
          caches
            .match(APP_SHELL)
            .then((cached) => cached ?? Response.error()),
        ),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
