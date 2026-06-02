<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { common } from "lowlight";

  let { editor }: { editor: Editor } = $props();

  let availableLangs = $state<string[]>(Object.keys(common).sort());
  let currentLang = $state("");
  let isInCodeBlock = $state(false);

  $effect(() => {
    if (!editor) return;
    const sync = () => {
      isInCodeBlock = editor.isActive("codeBlock");
      if (isInCodeBlock) {
        const attrs = editor.getAttributes("codeBlock");
        currentLang = attrs.language || "";
      } else {
        currentLang = "";
      }
    };
    sync();
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  });

  function setCodeLanguage(lang: string) {
    editor.chain().focus().updateAttributes("codeBlock", { language: lang }).run();
  }

  function unsetCodeLanguage() {
    editor.chain().focus().updateAttributes("codeBlock", { language: null }).run();
  }

  function addLink() {
    const url = prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }
</script>

<div class="toolbar flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-toolbar sticky top-0 z-10" style="border-color: var(--border-color);">
  <!-- Heading -->
  <button
    onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("heading", { level: 1 })}
    title="Heading 1"
  >H1</button>
  <button
    onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("heading", { level: 2 })}
    title="Heading 2"
  >H2</button>
  <button
    onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("heading", { level: 3 })}
    title="Heading 3"
  >H3</button>

  <span class="w-px h-5 bg-gray-300 mx-1"></span>

  <!-- Inline formatting -->
  <button
    onclick={() => editor.chain().focus().toggleBold().run()}
    class="toolbar-btn font-bold"
    class:is-active={editor.isActive("bold")}
    title="Bold"
  >B</button>
  <button
    onclick={() => editor.chain().focus().toggleItalic().run()}
    class="toolbar-btn italic"
    class:is-active={editor.isActive("italic")}
    title="Italic"
  >I</button>
  <button
    onclick={() => editor.chain().focus().toggleStrike().run()}
    class="toolbar-btn line-through"
    class:is-active={editor.isActive("strike")}
    title="Strikethrough"
  >S</button>
  <button
    onclick={() => editor.chain().focus().toggleUnderline().run()}
    class="toolbar-btn underline"
    class:is-active={editor.isActive("underline")}
    title="Underline"
  >U</button>
  <button
    onclick={() => editor.chain().focus().toggleCode().run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("code")}
    title="Inline code"
  >&lt;/&gt;</button>

  <span class="w-px h-5 bg-gray-300 mx-1"></span>

  <!-- Lists -->
  <button
    onclick={() => editor.chain().focus().toggleBulletList().run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("bulletList")}
    title="Bullet list"
  >≡</button>
  <button
    onclick={() => editor.chain().focus().toggleOrderedList().run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("orderedList")}
    title="Ordered list"
  >#</button>
  <button
    onclick={() => editor.chain().focus().toggleTaskList().run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("taskList")}
    title="Task list"
  >☑</button>

  <span class="w-px h-5 bg-gray-300 mx-1"></span>

  <!-- Block elements -->
  <button
    onclick={() => editor.chain().focus().toggleBlockquote().run()}
    class="toolbar-btn"
    class:is-active={editor.isActive("blockquote")}
    title="Blockquote"
  >"</button>
  <button
    onclick={() => editor.chain().focus().toggleCodeBlock().run()}
    class="toolbar-btn"
    class:is-active={isInCodeBlock}
    title="Code block"
  >⬚</button>
  <button onclick={addLink} class="toolbar-btn" class:is-active={editor.isActive("link")} title="Link">🔗</button>

  <!-- Code block language selector -->
  {#if isInCodeBlock}
    <span class="w-px h-5 bg-gray-300 mx-1"></span>
    <select
      class="text-xs border rounded px-1 py-0.5 max-w-[120px] bg-editor"
      style="border-color: var(--border-input); color: var(--text-primary);"
      value={currentLang}
      onchange={(e) => {
        const val = (e.target as HTMLSelectElement).value;
        if (val === "") unsetCodeLanguage();
        else setCodeLanguage(val);
      }}
    >
      <option value="">No language</option>
      {#each availableLangs as lang}
        <option value={lang} selected={currentLang === lang}>{lang}</option>
      {/each}
    </select>
  {/if}
</div>

<style>
  .toolbar {
    font-size: 13px;
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
    font-size: 13px;
    line-height: 1;
    outline: none;
  }
  .toolbar-btn:hover {
    background: var(--toolbar-btn-hover-bg);
  }
  .toolbar-btn.is-active {
    background: var(--toolbar-btn-active-bg);
    color: var(--toolbar-btn-active-text);
  }
</style>
