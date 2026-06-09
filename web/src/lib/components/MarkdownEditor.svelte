<script lang="ts">
  import { onMount } from "svelte";
  import { EditorView, basicSetup } from "codemirror";
  import { keymap } from "@codemirror/view";
  import { markdown } from "@codemirror/lang-markdown";
  import { EditorState } from "@codemirror/state";
  import MarkdownIt from "markdown-it";
  import katex from "katex";
  import markdownItKatex from "@traptitech/markdown-it-katex";
  import hljs from "highlight.js";
  import { uploadFile } from "$lib/api";

  type ViewMode = "edit" | "split" | "preview";

  let {
    content = "",
    noteId = "",
    insertMediaMd = "",
    insertMediaKey = 0,
    onContentChange,
    onOpenMediaPicker,
    onUploadComplete,
  }: {
    content?: string;
    noteId?: string;
    insertMediaMd?: string;
    insertMediaKey?: number;
    onContentChange?: (md: string) => void;
    onOpenMediaPicker?: () => void;
    onUploadComplete?: () => void;
  } = $props();

  let editorContainer = $state<HTMLDivElement | null>(null);
  let previewEl = $state<HTMLDivElement | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  let viewMode = $state<ViewMode>("edit");
  let cmView: EditorView | null = null;
  let uploadingFile = $state(false);
  let updatingContent = false;

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight(str: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch {}
      }
      return "";
    },
  }).use(markdownItKatex, {
    katex,
    throwOnError: false,
  });

  let prevInsertKey = 0;

  $effect(() => {
    if (insertMediaKey !== prevInsertKey && insertMediaMd && cmView) {
      prevInsertKey = insertMediaKey;
      const view = cmView;
      const tr = view.state.replaceSelection(insertMediaMd);
      view.dispatch(tr);
      view.focus();
      onUploadComplete?.();
    }
  });

  let initialSet = false;

  $effect(() => {
    if (previewEl && cmView) {
      renderPreview(cmView.state.doc.toString());
    }
  });

  $effect(() => {
    if (!cmView) return;
    if (!initialSet) {
      initialSet = true;
      const initial = content;
      if (initial) {
        updatingContent = true;
        const view = cmView;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: initial },
        });
        updatingContent = false;
      }
      return;
    }
    if (updatingContent) return;
    const currentMd = cmView.state.doc.toString();
    if (content !== undefined && content !== currentMd) {
      updatingContent = true;
      const view = cmView;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
      updatingContent = false;
      renderPreview(content);
    }
  });

  function renderPreview(text: string) {
    if (!previewEl) return;
    previewEl.innerHTML = md.render(text || "");
  }

  let previewDebounce: ReturnType<typeof setTimeout> | null = null;

  function onCmUpdate(doc: string) {
    if (updatingContent) return;
    onContentChange?.(doc);
    if (previewDebounce) clearTimeout(previewDebounce);
    previewDebounce = setTimeout(() => renderPreview(doc), 150);
  }

  const modeToggleKeymap = keymap.of([
    {
      key: "Ctrl-Shift-m",
      run: () => {
        toggleMode();
        return true;
      },
    },
    {
      key: "Ctrl-\\",
      run: () => {
        toggleMode();
        return true;
      },
    },
  ]);

  function toggleMode() {
    if (viewMode === "edit") viewMode = "split";
    else if (viewMode === "split") viewMode = "preview";
    else viewMode = "edit";
  }

  function setMode(mode: ViewMode) {
    viewMode = mode;
    if (mode !== "preview" && cmView) {
      requestAnimationFrame(() => cmView?.focus());
    }
  }

  async function uploadAndInsert(file: File) {
    uploadingFile = true;
    const extra: Record<string, string> = {};
    if (noteId) extra.note_id = noteId;
    try {
      const res = await uploadFile("/api/media", file, extra);
      if (res.ok) {
        const data = await res.json();
        const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${data.id}/file`;
        if (cmView) {
          let mdText: string;
          if (file.type.startsWith("image/")) {
            mdText = `![${file.name}](${url})`;
          } else {
            mdText = `[${file.name}](${url})`;
          }
          const view = cmView;
          view.dispatch(view.state.replaceSelection(mdText));
          view.focus();
        }
        onUploadComplete?.();
      }
    } catch {
      // ignore
    }
    uploadingFile = false;
  }

  function onFilePick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      uploadAndInsert(file);
      input.value = "";
    }
  }

  onMount(() => {
    const cmTheme = EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: "14px",
        },
        ".cm-content": {
          fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
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

    const extensions = [
      basicSetup,
      markdown(),
      modeToggleKeymap,
      cmTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onCmUpdate(update.state.doc.toString());
        }
      }),
      EditorView.domEventHandlers({
        drop: (event: DragEvent, view) => {
          const file = event.dataTransfer?.files?.[0];
          if (file) {
            event.preventDefault();
            uploadAndInsert(file);
          }
        },
        paste: (event: ClipboardEvent, view) => {
          const items = event.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.kind === "file") {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                uploadAndInsert(file);
                return;
              }
            }
          }
        },
      }),
    ];

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    cmView = new EditorView({
      state,
      parent: editorContainer!,
    });

    if (content) renderPreview(content);

    return () => {
      if (previewDebounce) clearTimeout(previewDebounce);
      cmView?.destroy();
      cmView = null;
    };
  });
</script>

<div class="markdown-editor flex flex-col flex-1 border rounded overflow-hidden bg-editor" style="border-color: var(--border-color);">
  <!-- Toolbar -->
  <div class="flex items-center gap-1 border-b px-2 py-1.5 bg-toolbar sticky top-0 z-10" style="border-color: var(--border-color);">
    <div class="flex items-center gap-0 border rounded overflow-hidden" style="border-color: var(--border-color);">
      <button
        onclick={() => setMode("edit")}
        class="mode-btn"
        class:active={viewMode === "edit"}
        title="Edit (Ctrl+Shift+M / Ctrl+\)"
      >Edit</button>
      <button
        onclick={() => setMode("split")}
        class="mode-btn"
        class:active={viewMode === "split"}
        title="Split (Ctrl+Shift+M / Ctrl+\)"
      >Split</button>
      <button
        onclick={() => setMode("preview")}
        class="mode-btn"
        class:active={viewMode === "preview"}
        title="Preview (Ctrl+Shift+M / Ctrl+\)"
      >Preview</button>
    </div>

    <span class="w-px h-5 mx-1" style="background: var(--border-color);"></span>

    <button
      onclick={() => fileInputEl?.click()}
      class="toolbar-btn"
      title="Upload file"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    </button>
    <button
      onclick={() => onOpenMediaPicker?.()}
      class="toolbar-btn"
      title="Browse media"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    </button>

    {#if uploadingFile}
      <span class="text-xs" style="color: var(--text-tertiary);">Uploading...</span>
    {/if}
  </div>

  <input type="file" bind:this={fileInputEl} onchange={onFilePick} class="hidden" />

  <!-- Editor + Preview -->
  <div class="flex flex-1 min-h-0">
    <div
      bind:this={editorContainer}
      class="flex-1 min-w-0 overflow-hidden"
      class:hidden={viewMode === "preview"}
      class:half-width={viewMode === "split"}
      style="border-right: {viewMode === 'split' ? '1px solid var(--border-color)' : 'none'};"
    ></div>
    <div
      bind:this={previewEl}
      class="flex-1 min-w-0 overflow-y-auto markdown-preview"
      class:hidden={viewMode === "edit"}
      class:half-width={viewMode === "split"}
    ></div>
  </div>
</div>

<style>
  .markdown-editor {
    --mode-btn-text: var(--text-secondary);
    --mode-btn-bg: transparent;
    --mode-btn-active-bg: var(--bg-btn-primary);
    --mode-btn-active-text: var(--text-btn-primary);
  }

  .mode-btn {
    padding: 2px 10px;
    font-size: 12px;
    border: none;
    background: var(--mode-btn-bg);
    color: var(--mode-btn-text);
    cursor: pointer;
    border-right: 1px solid var(--border-color);
    font-weight: 500;
  }
  .mode-btn:last-child {
    border-right: none;
  }
  .mode-btn.active {
    background: var(--bg-btn-primary);
    color: var(--text-btn-primary);
  }
  .mode-btn:hover:not(.active) {
    background: var(--bg-note-hover);
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    border-radius: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--toolbar-btn-text);
    outline: none;
  }
  .toolbar-btn:hover {
    background: var(--toolbar-btn-hover-bg);
  }

  .half-width {
    width: 50%;
  }

  .hidden {
    display: none !important;
  }

  /* Preview styles */
  .markdown-preview {
    padding: 12px 16px;
    color: var(--text-primary);
    line-height: 1.7;
    font-size: 15px;
  }

  .markdown-preview :global(h1) { font-size: 1.5rem; font-weight: 700; margin: 1em 0 0.5em; }
  .markdown-preview :global(h2) { font-size: 1.25rem; font-weight: 600; margin: 1em 0 0.5em; }
  .markdown-preview :global(h3) { font-size: 1.1rem; font-weight: 600; margin: 1em 0 0.5em; }
  .markdown-preview :global(p) { margin: 0.5em 0; }
  .markdown-preview :global(a) { color: var(--editor-link-color); }
  .markdown-preview :global(blockquote) {
    border-left: 4px solid var(--editor-blockquote-border);
    background: var(--editor-blockquote-bg);
    border-radius: 0 8px 8px 0;
    padding: 8px 16px;
    margin: 1em 0;
    color: var(--editor-blockquote-color);
  }
  .markdown-preview :global(blockquote p) { margin: 0.25em 0; }
  .markdown-preview :global(pre) {
    background: var(--editor-code-bg);
    border-radius: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
  }
  .markdown-preview :global(code) {
    background: var(--editor-inline-code-bg);
    border-radius: 3px;
    padding: 2px 5px;
    font-size: 0.875em;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }
  .markdown-preview :global(pre code) {
    background: none;
    padding: 0;
    font-size: inherit;
  }
  .markdown-preview :global(hr) {
    border: none;
    border-top: 1px solid var(--editor-hr-color);
    margin: 1.5em 0;
  }
  .markdown-preview :global(ul) {
    list-style: disc;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .markdown-preview :global(ol) {
    list-style: decimal;
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .markdown-preview :global(li) {
    margin: 0.25em 0;
  }
  .markdown-preview :global(li > p) {
    margin: 0;
  }
  .markdown-preview :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  .markdown-preview :global(th), .markdown-preview :global(td) {
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    text-align: left;
  }
  .markdown-preview :global(th) { background: var(--bg-note-hover); font-weight: 600; }
  .markdown-preview :global(img) { max-width: 100%; border-radius: 4px; }
  .markdown-preview :global(.katex-display) { margin: 1em 0; overflow-x: auto; }
  .markdown-preview :global(input[type="checkbox"]) { margin-right: 6px; }
</style>
