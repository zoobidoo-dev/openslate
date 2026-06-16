/*
 * zoobidoo (fork-only) — PWA service-worker registration.
 *
 * Kept out of any shared upstream file so it never conflicts on upstream
 * merges (see CLAUDE.md). Registers /service-worker.js (served from static/)
 * with no UI side effects: no install prompt, no banner, nothing visible.
 *
 * Safe to call on every layout mount — registration is idempotent and is
 * skipped during SSR / when service workers are unavailable.
 */
export function registerPwa(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Avoid registering against the dev server, where the static file isn't
  // served the same way and HMR makes a SW pointless.
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Registration failures are non-fatal — the app works without the SW.
    });
  });
}
