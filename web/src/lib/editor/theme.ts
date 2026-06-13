import { EditorView } from "codemirror";

export const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--editor-font-family)",
      fontSize: "var(--editor-font-size)",
      lineHeight: "var(--editor-line-height)",
      padding: "12px 16px",
      caretColor: "var(--text-primary)",
      color: "var(--text-primary)",
    },
    ".cm-gutters": {
      borderRight: "1px solid var(--border-color)",
      backgroundColor: "var(--bg-sidebar)",
      color: "var(--text-tertiary)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--bg-note-active)",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--text-primary)",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "var(--editor-selection-bg) !important",
    },
    ".cm-selectionMatch": {
      backgroundColor: "var(--bg-note-active)",
    },
    ".cm-focused": {
      outline: "none",
    },
    "&.cm-focused .cm-selectionBackground, &.cm-focused ::selection": {
      backgroundColor: "var(--editor-selection-bg) !important",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-sidebar)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-color)",
    },
  },
  { dark: false },
);
