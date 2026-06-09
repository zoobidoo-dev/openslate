<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";

  type MediaItem = {
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    note_id: string | null;
    tags: string[];
    created_at: string;
  };

  let { onClose, onSelect }: {
    onClose: () => void;
    onSelect: (item: MediaItem) => void;
  } = $props();

  let items = $state<MediaItem[]>([]);
  let loading = $state(true);
  let searchQuery = $state("");

  onMount(() => loadMedia());

  async function loadMedia() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      const res = await api(`/api/media?${params}`);
      if (res.ok) items = await res.json();
      else items = [];
    } catch {
      items = [];
    }
    loading = false;
  }

  function isImage(mime: string) {
    return mime.startsWith("image/");
  }

  function mediaUrl(item: MediaItem) {
    return `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${item.id}/file`;
  }

  function fileTypeIcon(mime: string) {
    if (mime.startsWith("image/")) return "🖼";
    if (mime.startsWith("video/")) return "🎬";
    if (mime === "application/pdf") return "📄";
    return "📎";
  }

  function mkdown(item: MediaItem): string {
    const url = mediaUrl(item);
    if (item.mime_type.startsWith("image/")) {
      return `![${item.original_name}](${url})`;
    }
    return `[${item.original_name}](${url})`;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center" role="none" onclick={onClose}>
  <div
    class="rounded-lg border shadow-2xl w-[600px] max-h-[80vh] flex flex-col"
    style="background: var(--bg-sidebar); border-color: var(--border-color);"
    role="dialog"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between p-3 border-b" style="border-color: var(--border-color);">
      <span class="font-semibold text-sm" style="color: var(--text-primary);">Insert media</span>
      <button onclick={onClose} class="text-xs" style="color: var(--text-tertiary);">Close</button>
    </div>
    <div class="p-3 border-b" style="border-color: var(--border-color);">
      <input
        bind:value={searchQuery}
        oninput={loadMedia}
        placeholder="Search media..."
        class="w-full text-sm px-2 py-1.5 rounded outline-none"
        style="color: var(--text-primary); background: var(--bg-editor); border: 1px solid var(--border-input);"
      />
    </div>
    <div class="flex-1 overflow-y-auto p-3">
      {#if loading}
        <p class="text-sm" style="color: var(--text-tertiary);">Loading...</p>
      {:else if items.length === 0}
        <p class="text-sm" style="color: var(--text-tertiary);">No media found</p>
      {:else}
        <div class="grid grid-cols-4 gap-2">
          {#each items as item}
            <button
              onclick={() => onSelect(item)}
              class="rounded border overflow-hidden text-left cursor-pointer hover:opacity-80 transition-opacity"
              style="border-color: var(--border-color); background: var(--bg-editor);"
            >
              {#if isImage(item.mime_type)}
                <div style="aspect-ratio: 1; overflow: hidden;">
                  <img src={mediaUrl(item)} alt={item.original_name} class="w-full h-full object-cover" />
                </div>
              {:else}
                <div class="flex items-center justify-center" style="aspect-ratio: 1;">
                  <span class="text-2xl">{fileTypeIcon(item.mime_type)}</span>
                </div>
              {/if}
              <div class="px-1.5 py-1">
                <p class="text-xs truncate" style="color: var(--text-primary);">{item.original_name}</p>
                <p class="text-xs" style="color: var(--text-tertiary);">Click to insert</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
