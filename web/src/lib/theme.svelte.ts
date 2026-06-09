import { api } from "$lib/api";

export type Theme = "light" | "dark" | "sepia" | "nord" | "monokai" | "tokyo-night";

export const themes: { id: Theme; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "sepia", name: "Sepia" },
  { id: "nord", name: "Nord" },
  { id: "monokai", name: "Monokai" },
  { id: "tokyo-night", name: "Tokyo Night" },
];

const STORAGE_KEY = "openslate-theme";

function getInitial(): Theme {
  if (typeof document === "undefined") return "light";
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "light";
}

let current = $state<Theme>(getInitial());

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", current);
}

export function getTheme(): Theme {
  return current;
}

function applyTheme(t: Theme) {
  current = t;
  localStorage.setItem(STORAGE_KEY, t);
  document.documentElement.setAttribute("data-theme", t);
}

export async function loadFromServer() {
  try {
    const res = await api("/api/preferences");
    if (res.ok) {
      const data = (await res.json()) as { theme?: string };
      if (data.theme && themes.some((theme) => theme.id === data.theme)) {
        applyTheme(data.theme as Theme);
      }
    }
  } catch {
    // use cached value
  }
}

export async function setTheme(t: Theme) {
  applyTheme(t);
  try {
    await api("/api/preferences", {
      method: "PUT",
      body: JSON.stringify({ theme: t }),
    });
  } catch {
    // will sync next time
  }
}
