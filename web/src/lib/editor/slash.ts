import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

interface SlashCommand {
  label: string;
  detail: string;
  insert: string;
  cursorOffset: number;
}

const commands: SlashCommand[] = [
  { label: "Heading 1", detail: "# Title", insert: "# ", cursorOffset: 2 },
  { label: "Heading 2", detail: "## Title", insert: "## ", cursorOffset: 3 },
  { label: "Heading 3", detail: "### Title", insert: "### ", cursorOffset: 4 },
  { label: "Bold", detail: "**text**", insert: "****", cursorOffset: 2 },
  { label: "Italic", detail: "*text*", insert: "**", cursorOffset: 1 },
  { label: "Strikethrough", detail: "~~text~~", insert: "~~~~", cursorOffset: 2 },
  { label: "Inline Code", detail: "`code`", insert: "``", cursorOffset: 1 },
  { label: "Code Block", detail: "```language```", insert: "```\n\n```", cursorOffset: 4 },
  { label: "Link", detail: "[text](url)", insert: "[](url)", cursorOffset: 1 },
  { label: "Image", detail: "![alt](url)", insert: "![](url)", cursorOffset: 2 },
  { label: "Bullet List", detail: "- item", insert: "- ", cursorOffset: 2 },
  { label: "Numbered List", detail: "1. item", insert: "1. ", cursorOffset: 3 },
  { label: "Task", detail: "- [ ] task", insert: "- [ ] ", cursorOffset: 6 },
  { label: "Blockquote", detail: "> quote", insert: "> ", cursorOffset: 2 },
  { label: "Table", detail: "| A | B |", insert: "|  |  |\n|----|----|\n|  |  |", cursorOffset: 2 },
  { label: "Divider", detail: "---", insert: "---", cursorOffset: 3 },
];

export function slashCommands(): Extension {
  return autocompletion({
    activateOnTyping: true,
    icons: false,
    defaultKeymap: true,
    override: [
      (ctx: CompletionContext) => {
        // Match / at start of line, optionally followed by any non-space chars
        const match = ctx.matchBefore(/\/[^\s]*$/);
        if (!match) return null;

        // Need at least the slash
        if (match.text.length < 1) return null;

        const query = match.text.slice(1).toLowerCase();
        const filtered = query
          ? commands.filter((c) => c.label.toLowerCase().includes(query))
          : commands;

        return {
          from: match.from,
          to: ctx.pos,
          filter: false,
          options: filtered.map((cmd) => ({
            label: cmd.label,
            detail: cmd.detail,
            type: "keyword" as const,
            apply: (view: EditorView, _completion, from: number, to: number) => {
              const line = view.state.doc.lineAt(from);
              const rest = line.text.slice(to - line.from);
              view.dispatch({
                changes: {
                  from: line.from,
                  to: Math.max(to, line.to),
                  insert: cmd.insert + rest,
                },
                selection: { anchor: line.from + cmd.cursorOffset },
              });
            },
          })),
        };
      },
    ],
  });
}
