<script lang="ts">
  import { onMount } from "svelte";
  import { createEditorExtensions, EditorState, EditorView } from "$lib/editor";
  import { uploadFile } from "$lib/api";

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
  let fileInputEl = $state<HTMLInputElement | null>(null);

  let cmView = $state<EditorView | null>(null);
  let uploadingFile = $state(false);
  let updatingContent = false;

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
    if (!cmView) return;
    if (!initialSet) {
      initialSet = true;
      const initial = content;
      if (initial) {
        updatingContent = true;
        try {
          const view = cmView;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: initial },
          });
        } finally {
          updatingContent = false;
        }
      }
      return;
    }
    if (updatingContent) return;
    const currentMd = cmView.state.doc.toString();
      if (content !== undefined && content !== currentMd) {
        updatingContent = true;
      try {
        const view = cmView;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
      } finally {
        updatingContent = false;
      }
    }
  });

  function handleDocChange(doc: string) {
    if (updatingContent) return;
    onContentChange?.(doc);
  }

  async function uploadAndInsert(file: File, view: EditorView) {
    uploadingFile = true;
    const extra: Record<string, string> = {};
    if (noteId) extra.note_id = noteId;
    try {
      const res = await uploadFile("/api/media", file, extra);
      if (res.ok) {
        const data = await res.json();
        const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${data.id}/file`;
        let mdText: string;
        if (file.type.startsWith("image/")) {
          mdText = `![${file.name}](${url})`;
        } else {
          mdText = `[${file.name}](${url})`;
        }
        view.dispatch(view.state.replaceSelection(mdText));
        view.focus();
      }
      onUploadComplete?.();
    } catch {
      // ignore
    }
    uploadingFile = false;
  }

  function onFilePick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && cmView) {
      uploadAndInsert(file, cmView);
      input.value = "";
    }
  }

  onMount(() => {
    const extensions = createEditorExtensions({
      onFileUpload: (file, view) => uploadAndInsert(file, view),
      onDocChange: handleDocChange,
    });

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    cmView = new EditorView({
      state,
      parent: editorContainer!,
    });

    return () => {
      cmView?.destroy();
      cmView = null;
    };
  });
</script>

<div class="markdown-editor flex flex-col flex-1 border rounded overflow-hidden bg-editor" style="border-color: var(--border-color);">
  <!-- Toolbar -->
  <div class="flex items-center gap-1 border-b px-2 py-1.5 bg-toolbar sticky top-0 z-10" style="border-color: var(--border-color);">
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

  <div
    bind:this={editorContainer}
    class="flex-1 min-h-0 overflow-hidden"
  ></div>
</div>

<style>
  .markdown-editor {
    --mode-btn-text: var(--text-secondary);
    --mode-btn-bg: transparent;
    --mode-btn-active-bg: var(--bg-btn-primary);
    --mode-btn-active-text: var(--text-btn-primary);
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
</style>
