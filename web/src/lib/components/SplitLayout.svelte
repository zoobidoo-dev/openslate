<script lang="ts">
  import PaneView from "./PaneView.svelte";
  import type { LayoutNode, PaneData, TabSession } from "$lib/types";

  type MediaItem = {
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
  };

  let {
    node,
    panes,
    focusedPaneId,
    onResize,
    insertMediaMd = "",
    insertMediaKey = 0,
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
    node: LayoutNode;
    panes: Record<string, PaneData>;
    focusedPaneId: string | null;
    onResize?: (splitId: string, ratio: number) => void;
    insertMediaMd?: string;
    insertMediaKey?: number;
    onSwitchTab?: (paneId: string, tabId: string) => void;
    onCloseTab?: (paneId: string, tabId: string) => void;
    onTabContextMenu?: (paneId: string, tabId: string, e: MouseEvent) => void;
    onReorderTabs?: (paneId: string, newTabs: TabSession[]) => void;
    onMoveTab?: (tabId: string, fromPaneId: string, toPaneId: string, insertIdx: number) => void;
    onTabTitleChange?: (paneId: string, title: string) => void;
    onTabTagsChange?: (paneId: string, tags: string) => void;
    onTabContentChange?: (paneId: string, md: string) => void;
    onOpenMediaPicker?: () => void;
    onRemoveMedia?: (paneId: string, m: MediaItem) => void;
    onUploadComplete?: (paneId: string) => void;
    onSelectNote?: (slug: string) => void;
  } = $props();

  let dragging = $state(false);
  let containerEl = $state<HTMLDivElement | null>(null);

  function onDividerDown(e: MouseEvent) {
    e.preventDefault();
    dragging = true;
    const onMove = (ev: MouseEvent) => {
      if (!containerEl || !node || node.type !== "split") return;
      const rect = containerEl.getBoundingClientRect();
      let pct: number;
      if (node.direction === "vertical") {
        pct = ((ev.clientX - rect.left) / rect.width) * 100;
      } else {
        pct = ((ev.clientY - rect.top) / rect.height) * 100;
      }
      pct = Math.max(15, Math.min(85, pct));
      onResize?.(node.id, Math.round(pct));
    };
    const onUp = () => {
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function getPaneData(id: string): PaneData {
    return panes[id] ?? { tabs: [], activeTabId: null, noteMedia: [] };
  }
</script>

{#if node.type === "pane"}
  {@const data = getPaneData(node.id)}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="pane-wrapper flex flex-col flex-1 min-h-0"
    class:focused={node.id === focusedPaneId}
    onclick={() => focusedPaneId !== node.id && onSwitchTab?.(node.id, data.activeTabId ?? "")}
  >
    <PaneView
      tabs={data.tabs}
      activeTabId={data.activeTabId}
      paneId={node.id}
      noteMedia={data.noteMedia}
      {insertMediaMd}
      {insertMediaKey}
      isFocused={node.id === focusedPaneId}
      onSwitchTab={(tabId) => onSwitchTab?.(node.id, tabId)}
      onCloseTab={(tabId) => onCloseTab?.(node.id, tabId)}
      onTabContextMenu={(tabId, e) => onTabContextMenu?.(node.id, tabId, e)}
      onReorderTabs={(newTabs) => onReorderTabs?.(node.id, newTabs)}
      onMoveTab={(tabId, fromPaneId, toPaneId, insertIdx) => onMoveTab?.(tabId, fromPaneId, toPaneId, insertIdx)}
      onTabTitleChange={(t) => onTabTitleChange?.(node.id, t)}
      onTabTagsChange={(t) => onTabTagsChange?.(node.id, t)}
      onTabContentChange={(md) => onTabContentChange?.(node.id, md)}
      onOpenMediaPicker={onOpenMediaPicker}
      onRemoveMedia={(m) => onRemoveMedia?.(node.id, m)}
      onUploadComplete={() => onUploadComplete?.(node.id)}
      onSelectNote={onSelectNote}
    />
  </div>
{:else if node.type === "split"}
  <div
    bind:this={containerEl}
    class="split-container flex flex-1 min-h-0"
    class:flex-col={node.direction === "horizontal"}
    class:split-dragging={dragging}
  >
    <div class="flex flex-col" style="flex: {node.ratio}; min-width: 0; min-height: 0; overflow: hidden;">
      <svelte:self
        node={node.children[0]}
        {panes}
        {focusedPaneId}
        {onResize}
        {insertMediaMd}
        {insertMediaKey}
        {onSwitchTab}
        {onCloseTab}
        {onTabContextMenu}
        {onReorderTabs}
        {onMoveTab}
        {onTabTitleChange}
        {onTabTagsChange}
        {onTabContentChange}
        {onOpenMediaPicker}
        {onRemoveMedia}
        {onUploadComplete}
        {onSelectNote}
      />
    </div>
    <div
      class="split-divider"
      class:split-divider-v={node.direction === "vertical"}
      class:split-divider-h={node.direction === "horizontal"}
      role="separator"
      tabindex="-1"
      onmousedown={onDividerDown}
    ></div>
    <div class="flex flex-col" style="flex: {100 - node.ratio}; min-width: 0; min-height: 0; overflow: hidden;">
      <svelte:self
        node={node.children[1]}
        {panes}
        {focusedPaneId}
        {onResize}
        {insertMediaMd}
        {insertMediaKey}
        {onSwitchTab}
        {onCloseTab}
        {onTabContextMenu}
        {onReorderTabs}
        {onMoveTab}
        {onTabTitleChange}
        {onTabTagsChange}
        {onTabContentChange}
        {onOpenMediaPicker}
        {onRemoveMedia}
        {onUploadComplete}
        {onSelectNote}
      />
    </div>
  </div>
{/if}

<style>
  .pane-wrapper {
    opacity: 0.85;
    transition: opacity 0.15s;
  }
  .pane-wrapper.focused {
    opacity: 1;
  }

  .split-container {
    position: relative;
  }
  .split-container.split-dragging {
    user-select: none;
    cursor: col-resize;
  }
  .split-container.flex-col.split-dragging {
    cursor: row-resize;
  }

  .split-divider {
    flex-shrink: 0;
    background: var(--border-color);
    transition: background 0.15s;
    position: relative;
    z-index: 2;
  }
  .split-divider:hover {
    background: var(--text-link);
  }
  .split-divider-v {
    width: 4px;
    cursor: col-resize;
  }
  .split-divider-h {
    height: 4px;
    cursor: row-resize;
  }
</style>
