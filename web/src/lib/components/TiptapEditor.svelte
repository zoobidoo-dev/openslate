<script lang="ts">
  import { onMount } from "svelte";
  import StarterKit from "@tiptap/starter-kit";
  import Underline from "@tiptap/extension-underline";
  import LinkExtension from "@tiptap/extension-link";
  import TaskList from "@tiptap/extension-task-list";
  import TaskItem from "@tiptap/extension-task-item";
  import Placeholder from "@tiptap/extension-placeholder";
  import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
  import { Markdown } from "tiptap-markdown";
  import { createLowlight, common } from "lowlight";
  import { Editor } from "@tiptap/core";
  import EditorToolbar from "./EditorToolbar.svelte";

  let { content = "", onContentChange }: { content?: string; onContentChange?: (md: string) => void } = $props();

  let editorEl: HTMLDivElement;
  let editor: Editor = $state() as unknown as Editor;

  const lowlight = createLowlight(common);

  let updatingContent = $state(false);

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: {
            levels: [1, 2, 3],
          },
        }),
        Underline,
        LinkExtension.configure({
          openOnClick: true,
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Placeholder.configure({
          placeholder: "Write in markdown...",
        }),
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: null,
        }),
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
      content,
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

  $effect(() => {
    if (editor && !editor.isDestroyed) {
      const currentMd = editor.storage.markdown.getMarkdown();
      if (content !== undefined && content !== currentMd) {
        updatingContent = true;
        editor.commands.setContent(content);
        updatingContent = false;
      }
    }
  });
</script>

<div class="tiptap-editor flex flex-col flex-1 border rounded overflow-hidden bg-editor" style="border-color: var(--border-color);">
  {#if editor}
    <EditorToolbar {editor} />
  {/if}
  <div bind:this={editorEl} class="prose prose-sm max-w-none flex-1 overflow-y-auto px-4 py-3 editor-content" style="outline: none;"></div>
</div>
