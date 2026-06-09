<script lang="ts">
  import { onMount } from "svelte";
  import StarterKit from "@tiptap/starter-kit";
  import Underline from "@tiptap/extension-underline";
  import LinkExtension from "@tiptap/extension-link";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import Placeholder from "@tiptap/extension-placeholder";
  import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
  import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
  import Highlight from "@tiptap/extension-highlight";
  import ImageExtension from "@tiptap/extension-image";
  import { Markdown } from "tiptap-markdown";
  import { createLowlight, common } from "lowlight";
  import { Editor } from "@tiptap/core";
  import EditorToolbar from "./EditorToolbar.svelte";
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

  let editorEl: HTMLDivElement;
  let editor: Editor = $state() as unknown as Editor;

  const lowlight = createLowlight(common);

  let updatingContent = $state(false);
  let uploadingFile = $state(false);
  let fileInputEl: HTMLInputElement;

  async function uploadAndInsert(file: File) {
    uploadingFile = true;
    const extra: Record<string, string> = {};
    if (noteId) extra.note_id = noteId;
    try {
      const res = await uploadFile("/api/media", file, extra);
      if (res.ok) {
        const data = await res.json();
        const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${data.id}/file`;
        if (editor) {
          if (file.type.startsWith("image/")) {
            editor.chain().focus().setImage({ src: url }).run();
          } else {
            editor.chain().focus().insertContent(`[${file.name}](${url})`).run();
          }
        }
        onUploadComplete?.();
      }
    } catch {
      // ignore
    }
    uploadingFile = false;
  }

  function handlePaste(e: ClipboardEvent): boolean {
    const items = e.clipboardData?.items;
    if (!items) return false;
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadAndInsert(file);
          return true;
        }
      }
    }
    return false;
  }

  function handleDrop(e: DragEvent): boolean {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      e.preventDefault();
      uploadAndInsert(file);
      return true;
    }
    return false;
  }

  let prevInsertKey = 0;
  $effect(() => {
    if (insertMediaKey !== prevInsertKey && insertMediaMd && editor && !editor.isDestroyed) {
      prevInsertKey = insertMediaKey;
      editor.chain().focus().insertContent(insertMediaMd).run();
      onUploadComplete?.();
    }
  });

  let pendingFirstContent = true;

  $effect(() => {
    if (editor && !editor.isDestroyed) {
      if (pendingFirstContent) {
        pendingFirstContent = false;
        updatingContent = true;
        editor.commands.setContent(content);
        updatingContent = false;
      } else {
        const currentMd = editor.storage.markdown.getMarkdown();
        if (content !== undefined && content !== currentMd) {
          updatingContent = true;
          editor.commands.setContent(content);
          updatingContent = false;
        }
      }
    }
  });

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        LinkExtension.configure({ openOnClick: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: "Write in markdown..." }),
        CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Highlight.configure({ multicolor: true }),
        ImageExtension,
        Markdown.configure({
          html: true,
          tightLists: true,
          tightListClass: "tight",
          bulletListMarker: "-",
          linkify: true,
          breaks: false,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      editorProps: {
        handlePaste: (_view, event) => handlePaste(event),
        handleDrop: (_view, event) => handleDrop(event),
      },
      onUpdate: ({ editor }) => {
        if (updatingContent) return;
        const md = editor.storage.markdown.getMarkdown();
        onContentChange?.(md);
      },
    });

    return () => {
      editor.destroy();
    };
  });

  function onFilePick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      uploadAndInsert(file);
      input.value = "";
    }
  }
</script>

<div class="tiptap-editor flex flex-col flex-1 border rounded overflow-hidden bg-editor" style="border-color: var(--border-color);">
  {#if editor}
    <EditorToolbar
      {editor}
      noteId={noteId}
      onUploadClick={() => fileInputEl?.click()}
      onOpenMediaPicker={() => onOpenMediaPicker?.()}
      onImportComplete={() => onUploadComplete?.()}
      uploading={uploadingFile}
    />
  {/if}
  <input type="file" bind:this={fileInputEl} onchange={onFilePick} class="hidden" />
  <div bind:this={editorEl} class="prose prose-sm max-w-none flex-1 overflow-y-auto px-4 py-3 editor-content" style="outline: none;"></div>
</div>
