import { api } from "$lib/api";

export type EditorFont = string;
export type EditorWidth = "full" | "constrained";
export type NoteSort = "updated" | "title" | "created";

export type FontEntry = { id: EditorFont; label: string; family: string; group: string };

export const FONTS: FontEntry[] = [
  // ── Sans-serif ──
  { id: "system-ui", label: "System UI", group: "Sans-serif", family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "helvetica", label: "Helvetica", group: "Sans-serif", family: '"Helvetica Neue", Helvetica, Arial, "Nimbus Sans", sans-serif' },
  { id: "inter", label: "Inter", group: "Sans-serif", family: '"Inter", "Inter Variable", system-ui, -apple-system, sans-serif' },
  { id: "sf-pro", label: "SF Pro", group: "Sans-serif", family: '-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' },
  { id: "segoe-ui", label: "Segoe UI", group: "Sans-serif", family: '"Segoe UI", "Segoe UI Variable", system-ui, -apple-system, sans-serif' },
  { id: "roboto", label: "Roboto", group: "Sans-serif", family: 'Roboto, "Helvetica Neue", Arial, system-ui, sans-serif' },
  { id: "open-sans", label: "Open Sans", group: "Sans-serif", family: '"Open Sans", system-ui, -apple-system, sans-serif' },
  { id: "lato", label: "Lato", group: "Sans-serif", family: 'Lato, system-ui, -apple-system, sans-serif' },
  { id: "noto-sans", label: "Noto Sans", group: "Sans-serif", family: '"Noto Sans", system-ui, -apple-system, sans-serif' },
  { id: "ubuntu", label: "Ubuntu", group: "Sans-serif", family: 'Ubuntu, system-ui, -apple-system, sans-serif' },
  { id: "gill-sans", label: "Gill Sans", group: "Sans-serif", family: '"Gill Sans", "Gill Sans MT", "Trebuchet MS", sans-serif' },
  { id: "optima", label: "Optima", group: "Sans-serif", family: 'Optima, "Segoe UI", Candara, Calibri, sans-serif' },
  { id: "avenir", label: "Avenir", group: "Sans-serif", family: 'Avenir, "Avenir Next", system-ui, -apple-system, sans-serif' },
  { id: "futura", label: "Futura", group: "Sans-serif", family: 'Futura, "Century Gothic", "Twentieth Century", sans-serif' },
  { id: "verdana", label: "Verdana", group: "Sans-serif", family: 'Verdana, Geneva, "DejaVu Sans", sans-serif' },
  { id: "trebuchet", label: "Trebuchet MS", group: "Sans-serif", family: '"Trebuchet MS", "Lucida Grande", "Lucida Sans", sans-serif' },
  { id: "tahoma", label: "Tahoma", group: "Sans-serif", family: 'Tahoma, Geneva, Verdana, sans-serif' },
  { id: "calibri", label: "Calibri", group: "Sans-serif", family: 'Calibri, Candara, "Segoe UI", "DejaVu Sans", sans-serif' },
  { id: "lucida-sans", label: "Lucida Sans", group: "Sans-serif", family: '"Lucida Sans", "Lucida Grande", "Lucida Sans Unicode", sans-serif' },
  { id: "corbel", label: "Corbel", group: "Sans-serif", family: 'Corbel, "Lucida Grande", "Lucida Sans", sans-serif' },
  // ── Serif ──
  { id: "georgia", label: "Georgia", group: "Serif", family: 'Georgia, "Times New Roman", "Times", "Liberation Serif", serif' },
  { id: "times", label: "Times New Roman", group: "Serif", family: '"Times New Roman", Times, "Liberation Serif", "Nimbus Roman", serif' },
  { id: "palatino", label: "Palatino", group: "Serif", family: 'Palatino, "Palatino Linotype", "Book Antiqua", "URW Palladio L", serif' },
  { id: "garamond", label: "Garamond", group: "Serif", family: 'Garamond, "EB Garamond", "Times New Roman", serif' },
  { id: "baskerville", label: "Baskerville", group: "Serif", family: 'Baskerville, "Baskerville Old Face", "Times New Roman", serif' },
  { id: "caslon", label: "Caslon", group: "Serif", family: '"Adobe Caslon Pro", "Big Caslon", "Times New Roman", serif' },
  { id: "charter", label: "Charter", group: "Serif", family: 'Charter, "Bitstream Charter", Georgia, "Times New Roman", serif' },
  { id: "bookman", label: "Bookman", group: "Serif", family: '"Bookman Old Style", "Bookman", "URW Bookman", serif' },
  { id: "cambria", label: "Cambria", group: "Serif", family: 'Cambria, "Hoefler Text", Georgia, serif' },
  { id: "didot", label: "Didot", group: "Serif", family: 'Didot, "Bodoni MT", "Bodoni 72", "Times New Roman", serif' },
  { id: "rockwell", label: "Rockwell", group: "Serif", family: 'Rockwell, "Courier Bold", Georgia, serif' },
  { id: "goudy", label: "Goudy Old Style", group: "Serif", family: '"Goudy Old Style", Garamond, "Times New Roman", serif' },
  { id: "hoefler", label: "Hoefler Text", group: "Serif", family: '"Hoefler Text", "Palatino Linotype", Georgia, serif' },
  { id: "perpetua", label: "Perpetua", group: "Serif", family: 'Perpetua, "Palatino Linotype", "Times New Roman", serif' },
  { id: "century", label: "Century Schoolbook", group: "Serif", family: '"Century Schoolbook", "Century", "Times New Roman", serif' },
  // ── Monospace ──
  { id: "system-mono", label: "System Mono", group: "Monospace", family: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace' },
  { id: "jetbrains-mono", label: "JetBrains Mono", group: "Monospace", family: '"JetBrains Mono", "Cascadia Code", "Fira Code", "Hack", ui-monospace, monospace' },
  { id: "fira-code", label: "Fira Code", group: "Monospace", family: '"Fira Code", "JetBrains Mono", "Cascadia Code", ui-monospace, monospace' },
  { id: "cascadia-code", label: "Cascadia Code", group: "Monospace", family: '"Cascadia Code", "Cascadia Mono", "JetBrains Mono", ui-monospace, monospace' },
  { id: "source-code-pro", label: "Source Code Pro", group: "Monospace", family: '"Source Code Pro", ui-monospace, "Cascadia Code", monospace' },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", group: "Monospace", family: '"IBM Plex Mono", ui-monospace, "Source Code Pro", monospace' },
  { id: "hack", label: "Hack", group: "Monospace", family: 'Hack, "DejaVu Sans Mono", ui-monospace, monospace' },
  { id: "inconsolata", label: "Inconsolata", group: "Monospace", family: 'Inconsolata, ui-monospace, "DejaVu Sans Mono", monospace' },
  { id: "courier", label: "Courier New", group: "Monospace", family: '"Courier New", Courier, "Liberation Mono", monospace' },
  { id: "roboto-mono", label: "Roboto Mono", group: "Monospace", family: '"Roboto Mono", ui-monospace, "Source Code Pro", monospace' },
  { id: "ubuntu-mono", label: "Ubuntu Mono", group: "Monospace", family: '"Ubuntu Mono", ui-monospace, "DejaVu Sans Mono", monospace' },
  { id: "anonymous-pro", label: "Anonymous Pro", group: "Monospace", family: '"Anonymous Pro", ui-monospace, "Courier New", monospace' },
  { id: "fira-mono", label: "Fira Mono", group: "Monospace", family: '"Fira Mono", ui-monospace, "Courier New", monospace' },
  { id: "mononoki", label: "mononoki", group: "Monospace", family: 'mononoki, "DejaVu Sans Mono", ui-monospace, monospace' },
  { id: "menlo", label: "Menlo", group: "Monospace", family: 'Menlo, Monaco, "Courier New", ui-monospace, monospace' },
];

const FONT_BY_ID: Record<string, FontEntry> = {};
for (const f of FONTS) FONT_BY_ID[f.id] = f;

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
  editorCodeFont: EditorFont;
  editorCodeFontSize: number;
  editorWidth: EditorWidth;
  editorLineNumbers: boolean;
  noteSort: NoteSort;
}

const DEFAULTS: Preferences = {
  editorFont: "system-mono",
  editorFontSize: 14,
  editorLineHeight: 1.6,
  editorCodeFont: "system-mono",
  editorCodeFontSize: 13,
  editorWidth: "full",
  editorLineNumbers: false,
  noteSort: "updated",
};

let prefs = $state<Preferences>({ ...DEFAULTS });
let loaded = $state(false);

function applyEditorCSS() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const font = FONT_BY_ID[prefs.editorFont];
  if (font) {
    root.style.setProperty("--editor-font-family", font.family);
  }
  const codeFont = FONT_BY_ID[prefs.editorCodeFont];
  if (codeFont) {
    root.style.setProperty("--editor-code-font-family", codeFont.family);
  }
  root.style.setProperty("--editor-font-size", `${prefs.editorFontSize}px`);
  root.style.setProperty("--editor-line-height", String(prefs.editorLineHeight));
  root.style.setProperty("--editor-code-font-size", `${prefs.editorCodeFontSize}px`);

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
      if (data.editorFont && FONT_BY_ID[data.editorFont]) {
        prefs.editorFont = data.editorFont as EditorFont;
      }
      if (data.editorCodeFont && FONT_BY_ID[data.editorCodeFont]) {
        prefs.editorCodeFont = data.editorCodeFont as EditorFont;
      }
      if (data.editorFontSize !== undefined) {
        const n = Number(data.editorFontSize);
        if (!isNaN(n) && n >= 10 && n <= 28) prefs.editorFontSize = n;
      }
      if (data.editorCodeFontSize !== undefined) {
        const n = Number(data.editorCodeFontSize);
        if (!isNaN(n) && n >= 10 && n <= 24) prefs.editorCodeFontSize = n;
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
  } catch (e) {
    console.error("Failed to load preferences:", e);
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
    const res = await api("/api/preferences", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) console.error("Failed to save preference:", key, res.status);
  } catch (e) {
    console.error("Failed to save preference:", key, e);
  }
}
