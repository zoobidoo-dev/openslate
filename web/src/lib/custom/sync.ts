const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type SyncEvent = {
  type: "note_created" | "note_updated" | "note_deleted";
  slug: string;
  updated_at?: string;
};

type ChangeHandler = (event: SyncEvent) => void;
type StatusHandler = (connected: boolean) => void;

let es: EventSource | null = null;
const changeHandlers = new Set<ChangeHandler>();
const statusHandlers = new Set<StatusHandler>();

// Slugs we saved ourselves in the last 3s — suppress the echo-back SSE event.
const recentSaves = new Map<string, number>();

export function markSaved(slug: string) {
  recentSaves.set(slug, Date.now());
  setTimeout(() => recentSaves.delete(slug), 3000);
}

export function startSync(onReconnect: () => void) {
  if (es) return;
  connect(onReconnect);
}

function connect(onReconnect: () => void) {
  let isFirst = true;
  es = new EventSource(`${API_URL}/api/events`, { withCredentials: true });

  es.onopen = () => {
    statusHandlers.forEach((h) => h(true));
    if (!isFirst) {
      // Missed events during the drop — caller re-syncs everything.
      onReconnect();
    }
    isFirst = false;
  };

  es.onmessage = (e) => {
    if (e.data === "ping") return;
    try {
      const event = JSON.parse(e.data) as SyncEvent;
      // Suppress echoes of our own saves.
      if (event.type !== "note_deleted" && recentSaves.has(event.slug)) return;
      changeHandlers.forEach((h) => h(event));
    } catch {}
  };

  es.onerror = () => {
    statusHandlers.forEach((h) => h(false));
    // Browser auto-retries EventSource; onopen fires again on reconnect.
  };
}

export function stopSync() {
  es?.close();
  es = null;
}

export function onSync(handler: ChangeHandler): () => void {
  changeHandlers.add(handler);
  return () => changeHandlers.delete(handler);
}

export function onStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  return () => statusHandlers.delete(handler);
}
