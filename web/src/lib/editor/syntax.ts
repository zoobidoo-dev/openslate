import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

// Custom syntax highlighting using theme CSS variables.
// Placed AFTER markdown() in the extension list so it wins.

const openslateHighlight = HighlightStyle.define([
  // ── Headings ──
  { tag: t.heading1, fontWeight: "700", color: "var(--text-primary)" },
  { tag: t.heading2, fontWeight: "700", color: "var(--text-primary)" },
  { tag: t.heading3, fontWeight: "600", color: "var(--text-primary)" },
  { tag: t.heading4, fontWeight: "600", color: "var(--text-primary)" },
  { tag: [t.heading5, t.heading6], fontWeight: "600", color: "var(--text-primary)" },

  // ── Inline formatting ──
  { tag: t.strong, fontWeight: "700", color: "var(--text-primary)" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--text-primary)" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--text-secondary)" },

  // ── Links and URLs ──
  { tag: t.link, color: "var(--editor-link-color)", textDecoration: "underline" },
  { tag: t.url, color: "var(--editor-link-color)" },

  // ── Code ──
  {
    tag: t.monospace,
    color: "var(--text-primary)",
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  // ── Markdown syntax markers (faint) ──
  { tag: t.processingInstruction, color: "var(--text-tertiary)" },
  { tag: t.contentSeparator, color: "var(--text-tertiary)" },

  // ── Block-level ──
  { tag: t.quote, color: "var(--text-secondary)" },
  { tag: t.list, color: "var(--text-secondary)" },
  { tag: t.meta, color: "var(--text-tertiary)" },

  // ── Punctuation and brackets ──
  {
    tag: [t.punctuation, t.bracket, t.squareBracket, t.paren, t.brace],
    color: "var(--text-tertiary)",
  },

  // ── Horizontal rule ──
  { tag: t.separator, color: "var(--border-color)" },

  // ── Code block token highlights ──
  // Uses --hljs-* variables so each token type gets a distinct, theme-appropriate color.
  { tag: t.keyword, color: "var(--hljs-keyword)", fontWeight: "500" },
  { tag: [t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword], color: "var(--hljs-keyword)" },
  { tag: [t.string, t.special(t.string)], color: "var(--hljs-string)" },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom], color: "var(--hljs-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--hljs-comment)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--hljs-type)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--hljs-title)" },
  { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], color: "var(--hljs-attr)" },
  { tag: t.regexp, color: "var(--hljs-regexp)" },
  { tag: t.escape, color: "var(--hljs-built_in)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--hljs-selector-tag)" },
  { tag: [t.variableName, t.labelName, t.definition(t.variableName), t.local(t.variableName)], color: "var(--hljs-variable)" },
  { tag: t.operator, color: "var(--hljs-meta)" },
  { tag: [t.attributeValue, t.character], color: "var(--hljs-string)" },
  { tag: t.invalid, color: "var(--hljs-deletion)" },
]);

export const openslateSyntaxHighlighting: Extension = syntaxHighlighting(openslateHighlight);
