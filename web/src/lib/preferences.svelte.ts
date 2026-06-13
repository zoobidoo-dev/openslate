import { api } from "$lib/api";

export type EditorFont = "monospace" | "sans-serif" | "serif";
export type EditorWidth = "full" | "constrained";
export type NoteSort = "updated" | "title" | "created";

export const FONT_LABELS: Record<EditorFont, string> = {
  monospace: "Monospace",
  "sans-serif": "Sans-serif",
  serif: "Serif",
};

const FONT_FAMILIES: Record<EditorFont, string> = {
  monospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  "sans-serif": 'system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};

export const WIDTH_LABELS: Record<EditorWidth, string> = {
  full: "Full width",
  constrained: "Constrained",
};

export const SORT_LABELS: Record<NoteSort, string> = {
  updated: "Last updated",
  title: "Title",
  created: "Created",
};

interface Preferences {
  editorFont: EditorFont;
  editorFontSize: number;
  editorLineHeight: number;
  editorWidth: EditorWidth;
  editorLineNumbers: boolean;
  noteSort: NoteSort;
}

const DEFAULTS: Preferences = {
  editorFont: "monospace",
  editorFontSize: 14,
  editorLineHeight: 1.6,
  editorWidth: "full",
  editorLineNumbers: false,
  noteSort: "updated",
};

let prefs = $state<Preferences>({ ...DEFAULTS });
let loaded = $state(false);

function applyEditorCSS() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--editor-font-family", FONT_FAMILIES[prefs.editorFont]);
  root.style.setProperty("--editor-font-size", `${prefs.editorFontSize}px`);
  root.style.setProperty("--editor-line-height", String(prefs.editorLineHeight));

  if (prefs.editorWidth === "constrained") {
    root.classList.add("editor-width-constrained");
  } else {
    root.classList.remove("editor-width-constrained");
  }

  if (!prefs.editorLineNumbers) {
    root.classList.add("hide-line-numbers");
  } else {
    root.classList.remove("hide-line-numbers");
  }
}

export async function loadFromServer() {
  try {
    const res = await api("/api/preferences");
    if (res.ok) {
      const data = await res.json();
      if (data.editorFont && ["monospace", "sans-serif", "serif"].includes(data.editorFont)) {
        prefs.editorFont = data.editorFont as EditorFont;
      }
      if (data.editorFontSize !== undefined) {
        const n = Number(data.editorFontSize);
        if (!isNaN(n) && n >= 10 && n <= 28) prefs.editorFontSize = n;
      }
      if (data.editorLineHeight !== undefined) {
        const n = Number(data.editorLineHeight);
        if (!isNaN(n) && n >= 1.0 && n <= 2.5) prefs.editorLineHeight = n;
      }
      if (data.editorWidth && ["full", "constrained"].includes(data.editorWidth)) {
        prefs.editorWidth = data.editorWidth as EditorWidth;
      }
      if (data.editorLineNumbers !== undefined) {
        prefs.editorLineNumbers = data.editorLineNumbers === "true";
      }
      if (data.noteSort && ["updated", "title", "created"].includes(data.noteSort)) {
        prefs.noteSort = data.noteSort as NoteSort;
      }
    }
  } catch {
    // use defaults
  }
  loaded = true;
  applyEditorCSS();
}

export function getPreferences(): Preferences {
  return prefs;
}

export function isLoaded(): boolean {
  return loaded;
}

export async function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  (prefs as unknown as Record<string, unknown>)[key] = value;
  applyEditorCSS();
  try {
    await api("/api/preferences", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
  } catch {
    // will sync next load
  }
}
