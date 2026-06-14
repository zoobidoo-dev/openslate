<script module lang="ts">
  type DragSource = { paneId: string; tabId: string } | null;
  let _dragSource: DragSource = null;
</script>

<script lang="ts">
  import { X } from "@lucide/svelte";
  import MarkdownEditor from "./MarkdownEditor.svelte";

  type Backlink = { title: string; slug: string };

  interface TabSession {
    id: string;
    noteId: string | null;
    slug: string;
    title: string;
    content: string;
    tags: string;
    dirty: boolean;
    savedTitle: string;
    savedContent: string;
    savedTags: string;
    backlinks: Backlink[];
  }

  type MediaItem = {
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
  };

  let {
    tabs = [] as TabSession[],
    activeTabId = null as string | null,
    paneId = "",
    noteMedia = [] as MediaItem[],
    insertMediaMd = "",
    insertMediaKey = 0,
    isFocused = true,
    onSwitchTab,
    onCloseTab,
    onTabContextMenu,
    onReorderTabs,
    onMoveTab,
    onTabTitleChange,
    onTabTagsChange,
    onTabContentChange,
    onOpenMediaPicker,
    onRemoveMedia,
    onUploadComplete,
    onSelectNote,
  }: {
    tabs?: TabSession[];
    activeTabId?: string | null;
    paneId?: string;
    noteMedia?: MediaItem[];
    insertMediaMd?: string;
    insertMediaKey?: number;
    isFocused?: boolean;
    onSwitchTab?: (tabId: string) => void;
    onCloseTab?: (tabId: string) => void;
    onTabContextMenu?: (tabId: string, e: MouseEvent) => void;
    onReorderTabs?: (newTabs: TabSession[]) => void;
    onMoveTab?: (tabId: string, fromPaneId: string, toPaneId: string, insertIdx: number) => void;
    onTabTitleChange?: (title: string) => void;
    onTabTagsChange?: (tags: string) => void;
    onTabContentChange?: (md: string) => void;
    onOpenMediaPicker?: () => void;
    onRemoveMedia?: (m: MediaItem) => void;
    onUploadComplete?: () => void;
    onSelectNote?: (slug: string) => void;
  } = $props();

  let activeTab = $derived(tabs.find((t) => t.id === activeTabId) ?? null);

  let dragIdx = $state<number | null>(null);
  let overIdx = $state<number | null>(null);
  let overSide = $state<"left" | "right" | null>(null);

  function resetDrag() {
    dragIdx = null;
    overIdx = null;
    overSide = null;
    _dragSource = null;
  }

  function draggableTab(node: HTMLElement, initialIdx: number) {
    let idx = initialIdx;
    node.draggable = true;

    function onDragStart(e: DragEvent) {
      dragIdx = idx;
      _dragSource = { paneId, tabId: tabs[idx].id };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tabs[idx].id);
      }
    }

    function onDragOver(e: DragEvent) {
      if (!_dragSource) return;
      e.preventDefault();
      if (_dragSource.paneId === paneId && dragIdx === idx) {
        overIdx = null;
        overSide = null;
        return;
      }
      const rect = node.getBoundingClientRect();
      overIdx = idx;
      overSide = e.clientX < rect.left + rect.width / 2 ? "left" : "right";
    }

    function onDragLeave(e: DragEvent) {
      if (node.contains(e.relatedTarget as Node)) return;
      overIdx = null;
      overSide = null;
    }

    function onDrop(e: DragEvent) {
      e.preventDefault();
      if (!_dragSource || overIdx === null || overSide === null) return;

      const { paneId: fromPaneId, tabId } = _dragSource;
      let insertAt = overSide === "right" ? overIdx + 1 : overIdx;

      if (fromPaneId === paneId && dragIdx !== null) {
        if (dragIdx === overIdx) {
          resetDrag();
          return;
        }
        const newTabs = [...tabs];
        const [dragged] = newTabs.splice(dragIdx, 1);
        if (dragIdx < insertAt) insertAt--;
        newTabs.splice(insertAt, 0, dragged);
        onReorderTabs?.(newTabs);
      } else {
        onMoveTab?.(tabId, fromPaneId, paneId, insertAt);
      }

      resetDrag();
    }

    function onDragEnd() {
      resetDrag();
    }

    node.addEventListener("dragstart", onDragStart);
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    node.addEventListener("dragend", onDragEnd);

    return {
      update(newIdx: number) {
        idx = newIdx;
      },
      destroy() {
        node.removeEventListener("dragstart", onDragStart);
        node.removeEventListener("dragover", onDragOver);
        node.removeEventListener("dragleave", onDragLeave);
        node.removeEventListener("drop", onDrop);
        node.removeEventListener("dragend", onDragEnd);
        node.draggable = false;
      },
    };
  }
</script>

<div class="pane flex flex-col min-h-0 flex-1">
  {#if tabs.length > 0}
    <div class="tab-bar" ondragover={(e) => { if (_dragSource) e.preventDefault(); }} ondrop={(e) => { e.preventDefault(); resetDrag(); }}>
      {#each tabs as tab, idx}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          role="none"
          class="tab-item"
          class:active={tab.id === activeTabId}
          class:dragging={dragIdx === idx}
          class:drop-left={overIdx === idx && overSide === "left"}
          class:drop-right={overIdx === idx && overSide === "right"}
          use:draggableTab={idx}
          onclick={() => onSwitchTab?.(tab.id)}
          onmousedown={(e) => { if (e.button === 1) { e.preventDefault(); onCloseTab?.(tab.id); } }}
          oncontextmenu={(e) => { e.preventDefault(); e.stopPropagation(); onTabContextMenu?.(tab.id, e); }}
          title={tab.title || "Untitled"}
        >
          {#if tab.dirty}
            <span class="tab-dirty visible"></span>
          {/if}
          <span class="tab-title">{tab.title || "Untitled"}</span>
          <button
            class="tab-close"
            onclick={(e) => { e.stopPropagation(); onCloseTab?.(tab.id); }}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      {/each}
    </div>

    {#if activeTab}
      <div class="flex-1 flex flex-col min-h-0 p-4 gap-2" style="background: var(--bg-editor);">
        <input
          value={activeTab.title}
          oninput={(e) => onTabTitleChange?.((e.target as HTMLInputElement).value)}
          placeholder="Note title"
          class="text-2xl font-bold border-b pb-2 outline-none"
          style="color: var(--text-primary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
        />
        <input
          value={activeTab.tags}
          oninput={(e) => onTabTagsChange?.((e.target as HTMLInputElement).value)}
          placeholder="Tags (comma separated)"
          class="text-sm outline-none border-b pb-2"
          style="color: var(--text-secondary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
        />
        <MarkdownEditor
          content={activeTab.content}
          noteId={activeTab.noteId ?? ""}
          {insertMediaMd}
          {insertMediaKey}
          onContentChange={(md: string) => onTabContentChange?.(md)}
          {onOpenMediaPicker}
          {onUploadComplete}
        />
        {#if noteMedia.length > 0}
          <div class="border-t pt-2 mt-4" style="border-color: var(--border-color);">
            <p class="text-xs mb-1 font-medium" style="color: var(--text-secondary);">Attachments ({noteMedia.length})</p>
            <div class="flex gap-2 flex-wrap">
              {#each noteMedia as m}
                <div class="inline-flex items-center gap-1">
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${m.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs px-2 py-1 rounded border inline-flex items-center gap-1 hover:opacity-80"
                    style="border-color: var(--border-color); color: var(--text-primary); background: var(--bg-editor); text-decoration: none;"
                  >
                    {m.mime_type.startsWith("image/") ? "🖼" : m.mime_type.startsWith("video/") ? "🎬" : "📄"}
                    {m.original_name}
                  </a>
                  <button
                    onclick={() => onRemoveMedia?.(m)}
                    class="text-xs px-1 rounded"
                    style="color: var(--text-danger); border: 1px solid var(--border-color); background: var(--bg-editor); cursor: pointer;"
                    title="Remove from note"
                  >&times;</button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if activeTab.backlinks && activeTab.backlinks.length > 0}
          <div class="border-t pt-2 mt-4" style="border-color: var(--border-color);">
            <p class="text-xs mb-1" style="color: var(--text-secondary);">Linked from:</p>
            {#each activeTab.backlinks as bl}
              <button
                onclick={() => onSelectNote?.(bl.slug)}
                class="text-sm hover:underline"
                style="color: var(--text-link);"
              >
                {bl.title}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="flex-1 flex items-center justify-center">
      <p style="color: var(--text-tertiary);">Select or create a note</p>
    </div>
  {/if}
</div>

<style>
  .tab-item.dragging {
    opacity: 0.4;
  }
  .tab-item.drop-left {
    box-shadow: -2px 0 0 var(--text-link);
  }
  .tab-item.drop-right {
    box-shadow: 2px 0 0 var(--text-link);
  }
</style>
