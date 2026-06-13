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
  { tag: t.keyword, color: "var(--text-link)", fontWeight: "500" },
  { tag: [t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword], color: "var(--text-link)" },
  { tag: [t.string, t.special(t.string)], color: "var(--text-secondary)" },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom], color: "var(--text-link)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--text-tertiary)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--text-link)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--text-primary)" },
  { tag: [t.propertyName, t.attributeName, t.definition(t.propertyName)], color: "var(--text-link)" },
  { tag: t.regexp, color: "var(--text-danger)" },
  { tag: t.escape, color: "var(--text-link)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--text-link)" },
  { tag: [t.variableName, t.labelName, t.definition(t.variableName), t.local(t.variableName)], color: "var(--text-primary)" },
  { tag: t.operator, color: "var(--text-secondary)" },
  { tag: [t.attributeValue, t.character], color: "var(--text-secondary)" },
  { tag: t.invalid, color: "var(--text-danger)" },
]);

export const openslateSyntaxHighlighting: Extension = syntaxHighlighting(openslateHighlight);
