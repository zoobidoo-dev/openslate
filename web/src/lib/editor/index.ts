import { basicSetup } from "codemirror";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree, LanguageDescription, StreamLanguage } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

// Dedicated language packages
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { sql } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { yaml as yamlLang } from "@codemirror/lang-yaml";

// Legacy modes (StreamLanguage-based)
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { powerShell } from "@codemirror/legacy-modes/mode/powershell";
import { r } from "@codemirror/legacy-modes/mode/r";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { groovy } from "@codemirror/legacy-modes/mode/groovy";
import { clojure } from "@codemirror/legacy-modes/mode/clojure";
import { erlang } from "@codemirror/legacy-modes/mode/erlang";
import { fortran } from "@codemirror/legacy-modes/mode/fortran";
import { coffeeScript } from "@codemirror/legacy-modes/mode/coffeescript";
import { crystal } from "@codemirror/legacy-modes/mode/crystal";
import { dart } from "@codemirror/legacy-modes/mode/clike";
import { scala } from "@codemirror/legacy-modes/mode/clike";
import { kotlin } from "@codemirror/legacy-modes/mode/clike";

import { editorTheme } from "./theme";
import { createUploadExtension } from "./upload";
import { livePreviewPlugin } from "./decorations";
import { openslateSyntaxHighlighting } from "./syntax";
import { slashCommands } from "./slash";

export interface EditorExtensionsOptions {
  onFileUpload: (file: File, view: EditorView) => void;
  onDocChange: (doc: string) => void;
}

function legacyLang(name: string, aliases: string[], extensions: string[], parser: Parameters<typeof StreamLanguage.define>[0]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return LanguageDescription.of({ name, alias: aliases, extensions, load: () => Promise.resolve(StreamLanguage.define(parser)) as any });
}

const codeLanguages: LanguageDescription[] = [
  LanguageDescription.of({ name: "JavaScript", alias: ["js"], extensions: ["js", "mjs", "cjs"], load: async () => javascript() }),
  LanguageDescription.of({ name: "TypeScript", alias: ["ts"], extensions: ["ts", "mts", "cts"], load: async () => javascript({ typescript: true }) }),
  LanguageDescription.of({ name: "JSX", alias: ["jsx"], extensions: ["jsx"], load: async () => javascript({ jsx: true }) }),
  LanguageDescription.of({ name: "TSX", alias: ["tsx"], extensions: ["tsx"], load: async () => javascript({ jsx: true, typescript: true }) }),
  LanguageDescription.of({ name: "Python", alias: ["py"], extensions: ["py"], load: async () => python() }),
  LanguageDescription.of({ name: "Rust", alias: ["rs"], extensions: ["rs"], load: async () => rust() }),
  LanguageDescription.of({ name: "Go", alias: ["go"], extensions: ["go"], load: async () => go() }),
  LanguageDescription.of({ name: "Java", alias: ["java"], extensions: ["java"], load: async () => java() }),
  LanguageDescription.of({ name: "C++", alias: ["cpp", "c++"], extensions: ["cpp", "cxx", "hpp", "cc"], load: async () => cpp() }),
  LanguageDescription.of({ name: "C", alias: ["c"], extensions: ["c", "h"], load: async () => cpp() }),
  LanguageDescription.of({ name: "PHP", alias: ["php"], extensions: ["php"], load: async () => php() }),
  LanguageDescription.of({ name: "SQL", alias: ["sql"], extensions: ["sql"], load: async () => sql() }),
  LanguageDescription.of({ name: "JSON", alias: ["json"], extensions: ["json"], load: async () => json() }),
  LanguageDescription.of({ name: "XML", alias: ["xml"], extensions: ["xml"], load: async () => xml() }),
  LanguageDescription.of({ name: "YAML", alias: ["yaml", "yml"], extensions: ["yaml", "yml"], load: async () => yamlLang() }),
  LanguageDescription.of({ name: "CSS", alias: ["css"], extensions: ["css"], load: async () => css() }),
  LanguageDescription.of({ name: "HTML", alias: ["html"], extensions: ["html", "htm"], load: async () => html() }),
  LanguageDescription.of({ name: "Markdown", alias: ["md"], extensions: ["md"], load: async () => { const m = await import("@codemirror/lang-markdown"); return m.markdown(); } }),
  // Legacy modes
  legacyLang("Shell", ["sh", "bash", "zsh"], ["sh", "bash"], shell),
  legacyLang("Ruby", ["rb"], ["rb"], ruby),
  legacyLang("Swift", ["swift"], ["swift"], swift),
  legacyLang("TOML", ["toml"], ["toml"], toml),
  legacyLang("Dockerfile", ["dockerfile", "docker"], [], dockerFile),
  legacyLang("PowerShell", ["powershell", "ps1", "pwsh"], ["ps1", "psm1"], powerShell),
  legacyLang("R", ["r"], ["r", "R"], r),
  legacyLang("Haskell", ["hs"], ["hs", "lhs"], haskell),
  legacyLang("Lua", ["lua"], ["lua"], lua),
  legacyLang("Perl", ["pl"], ["pl", "pm"], perl),
  legacyLang("Groovy", ["groovy"], ["groovy"], groovy),
  legacyLang("Clojure", ["clj"], ["clj", "cljs", "edn"], clojure),
  legacyLang("Erlang", ["erl"], ["erl", "hrl"], erlang),
  legacyLang("Fortran", ["f90"], ["f90", "f95", "f", "for"], fortran),
  legacyLang("CoffeeScript", ["coffee"], ["coffee"], coffeeScript),
  legacyLang("Crystal", ["cr"], ["cr"], crystal),
  legacyLang("Dart", ["dart"], ["dart"], dart),
  legacyLang("Scala", ["scala", "sc"], ["scala", "sc"], scala),
  legacyLang("Kotlin", ["kt"], ["kt", "kts"], kotlin),
];

function openLinkAt(view: EditorView, pos: number): boolean {
  const tree = syntaxTree(view.state);
  let node: SyntaxNode | null = tree.resolveInner(pos, 1);
  while (node && node.name !== "Link") {
    node = node.parent;
  }
  if (!node) return false;
  const urlNode = node.getChild("URL");
  if (!urlNode) return false;
  const url = view.state.doc.sliceString(urlNode.from, urlNode.to);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

const linkPointerGuard = ViewPlugin.fromClass(
  class {
    private readonly onPointerDown = (event: PointerEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const linkEl = target.closest<HTMLElement>(".cm-lp-link");
      if (!linkEl || !this.view.contentDOM.contains(linkEl)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    constructor(readonly view: EditorView) {
      view.dom.addEventListener("pointerdown", this.onPointerDown, true);
    }
    destroy() {
      this.view.dom.removeEventListener("pointerdown", this.onPointerDown, true);
    }
  },
);

const linkClickHandler = EditorView.domEventHandlers({
  click: (event, view) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (event.button !== 0) return false;
    const target = event.target;
    if (!(target instanceof Element)) return false;
    const linkEl = target.closest<HTMLElement>(".cm-lp-link");
    if (!linkEl || !view.contentDOM.contains(linkEl)) return false;
    const pos = view.posAtDOM(linkEl);
    if (pos < 0) return false;
    event.preventDefault();
    event.stopPropagation();
    return openLinkAt(view, pos);
  },
});

export function createEditorExtensions(options: EditorExtensionsOptions) {
  return [
    basicSetup,
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage, codeLanguages }),
    openslateSyntaxHighlighting,
    editorTheme,
    createUploadExtension(options.onFileUpload),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        options.onDocChange(update.state.doc.toString());
      }
    }),
    linkPointerGuard,
    linkClickHandler,
    slashCommands(),
    livePreviewPlugin,
  ];
}

export { EditorState, EditorView };
