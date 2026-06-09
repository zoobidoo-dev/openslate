<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import * as auth from "$lib/auth.svelte";
  import * as theme from "$lib/theme.svelte";
  import { goto } from "$app/navigation";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import MediaGallery from "$lib/components/MediaGallery.svelte";
  import MediaPicker from "$lib/components/MediaPicker.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";

  type NoteSummary = {
    id: string;
    title: string;
    slug: string;
    tags: string[];
    created_at: string;
    updated_at: string;
  };

  type NoteDetail = NoteSummary & {
    content: string;
    backlinks: { title: string; slug: string }[];
  };

  type SearchResult = {
    id: string;
    title: string;
    slug: string;
    created_at: string;
    updated_at: string;
    title_highlight: string | null;
    content_snippet: string | null;
  };

  let notes = $state<NoteSummary[]>([]);
  let selected = $state<NoteDetail | null>(null);
  let loading = $state(true);
  let editTitle = $state("");
  let editContent = $state("");
  let editTags = $state("");

  let creating = $state(false);
  let dirty = $state(false);

  let savedTitle = "";
  let savedContent = "";
  let savedTags = "";

  let currentTheme = $state(theme.getTheme());
  let activeTab = $state<"notes" | "media">("notes");
  let showMediaPicker = $state(false);
  let mediaInsertKey = $state(0);
  let mediaToInsertMd = $state("");
  let noteMedia = $state<{ id: string; filename: string; original_name: string; mime_type: string; }[]>([]);

  let ctxMenu = $state<{ x: number; y: number; note?: NoteSummary } | null>(null);
  let ctxMenuNote = $state<NoteSummary | null>(null);
  let renamingSlug = $state<string | null>(null);
  let renameValue = $state("");

  let searchQuery = $state("");
  let searchResults = $state<SearchResult[]>([]);
  let searching = $state(false);
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  let cmdPaletteOpen = $state(false);

  onMount(() => {
    loadNotes();

    const interval = setInterval(() => {
      if (dirty) save();
    }, 2000);

    function onKeydown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && !e.altKey) {
        switch (e.code) {
          case "KeyP":
            e.preventDefault();
            e.stopPropagation();
            cmdPaletteOpen = !cmdPaletteOpen;
            return;
          case "KeyK":
            e.preventDefault();
            e.stopPropagation();
            startCreate();
            return;
          case "KeyS":
            e.preventDefault();
            e.stopPropagation();
            save();
            return;
          case "KeyF":
            e.preventDefault();
            e.stopPropagation();
            focusSearch();
            return;
          case "KeyG":
            e.preventDefault();
            e.stopPropagation();
            activeTab = activeTab === "media" ? "notes" : "media";
            return;
        }
      }
      if (e.key === "Escape") {
        if (cmdPaletteOpen) {
          cmdPaletteOpen = false;
          return;
        }
        if (searchQuery) {
          clearSearch();
          return;
        }
        closeCtxMenu();
        if (renamingSlug) {
          renamingSlug = null;
          renameValue = "";
        }
      }
    }

    document.addEventListener("keydown", onKeydown, { capture: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener("keydown", onKeydown, { capture: true });
    };
  });

  function closeCtxMenu() {
    ctxMenu = null;
    ctxMenuNote = null;
  }

  function handleCtxMenu(e: MouseEvent, note?: NoteSummary) {
    e.preventDefault();
    e.stopPropagation();
    ctxMenu = { x: e.clientX, y: e.clientY };
    ctxMenuNote = note ?? null;
  }

  function focusSearch() {
    searchInputEl?.focus();
  }

  async function loadNotes() {
    loading = true;
    try {
      const res = await api("/api/notes");
      notes = await res.json();
    } catch {
      notes = [];
    }
    loading = false;
  }

  async function doSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      searching = false;
      return;
    }
    searching = true;
    try {
      const res = await api(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        searchResults = await res.json();
      } else {
        searchResults = [];
      }
    } catch {
      searchResults = [];
    }
    searching = false;
  }

  function handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => doSearch(val), 200);
  }

  function clearSearch() {
    searchQuery = "";
    searchResults = [];
    searching = false;
    searchInputEl?.blur();
  }

  function openMediaPicker() {
    showMediaPicker = true;
  }

  function handleMediaSelect(item: { id: string; original_name: string; mime_type: string }) {
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${item.id}/file`;
    const md = item.mime_type.startsWith("image/")
      ? `![${item.original_name}](${url})`
      : `[${item.original_name}](${url})`;
    mediaToInsertMd = md;
    mediaInsertKey++;
    showMediaPicker = false;
    if (selected?.id) {
      api(`/api/media/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ note_id: selected.id }),
      });
    }
  }

  async function loadNoteMedia(noteId: string) {
    try {
      const res = await api(`/api/media?note_id=${noteId}`);
      if (res.ok) noteMedia = await res.json();
      else noteMedia = [];
    } catch {
      noteMedia = [];
    }
  }

  async function removeNoteMedia(m: { id: string }) {
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${m.id}/file`;
    await api(`/api/media/${m.id}`, { method: "PUT", body: JSON.stringify({ note_id: "" }) });
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    editContent = editContent.replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)|\\[.*?\\]\\(${escaped}\\)`, "g"), "");
    if (selected?.id) loadNoteMedia(selected.id);
  }

  async function selectNote(slug: string) {
    if (dirty) await save();
    const res = await api(`/api/notes/${slug}`);
    if (res.ok) {
      const note: NoteDetail = await res.json();
      selected = note;
      editTitle = note.title;
      editContent = note.content;
      editTags = note.tags.join(", ");
      savedTitle = note.title;
      savedContent = note.content;
      savedTags = note.tags.join(", ");
      creating = false;
      dirty = false;
      loadNoteMedia(note.id);
    }
  }

  function startCreate() {
    if (dirty) save();
    creating = true;
    selected = null;
    editTitle = "";
    editContent = "";
    editTags = "";
    savedTitle = "";
    savedContent = "";
    savedTags = "";
    dirty = false;
    closeCtxMenu();
  }

  function startRename(note: NoteSummary) {
    renamingSlug = note.slug;
    renameValue = note.title;
    closeCtxMenu();
  }

  async function commitRename() {
    if (!renamingSlug) return;
    const slug = renamingSlug;
    renamingSlug = null;
    const val = renameValue.trim();
    if (!val || val === notes.find((n) => n.slug === slug)?.title) return;
    await api(`/api/notes/${slug}`, {
      method: "PUT",
      body: JSON.stringify({ title: val }),
    });
    if (selected?.slug === slug) {
      selected.title = val;
      editTitle = val;
      savedTitle = val;
    }
    await loadNotes();
  }

  function cancelRename() {
    renamingSlug = null;
    renameValue = "";
  }

  async function deleteNote(note: NoteSummary) {
    closeCtxMenu();
    if (!confirm(`Delete "${note.title}"?`)) return;
    await api(`/api/notes/${note.slug}`, { method: "DELETE" });
    if (selected?.slug === note.slug) {
      selected = null;
      creating = false;
    }
    await loadNotes();
  }

  async function save() {
    if (!selected && !creating) return;
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (creating) {
      const res = await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: editTitle || "Untitled",
          content: editContent,
          tags,
        }),
      });
      if (res.ok) {
        selected = await res.json();
        creating = false;
      }
    } else if (selected?.slug) {
      await api(`/api/notes/${selected.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          tags,
        }),
      });
    }

    savedTitle = editTitle;
    savedContent = editContent;
    savedTags = editTags;
    dirty = false;
    await loadNotes();
  }

  function markDirty() {
    dirty = true;
  }

  async function handleLogout() {
    await auth.logout();
    goto("/login");
  }

  function formatDate(iso: string) {
    return iso.slice(0, 10);
  }

  function focusInput(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<div class="flex h-screen">
  <!-- Sidebar -->
  <aside
    class="w-64 border-r flex flex-col bg-sidebar"
    style="border-color: var(--border-color);"
    oncontextmenu={(e) => handleCtxMenu(e)}
  >
    <div class="p-3 border-b flex flex-col gap-2" style="border-color: var(--border-color);">
      <div class="flex items-center justify-between">
        <h1 class="font-bold text-lg" style="color: var(--text-primary);">openslate</h1>
        <div class="flex items-center gap-2">
          <button onclick={() => cmdPaletteOpen = true} class="text-xs px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80" style="color: var(--text-tertiary); border-color: var(--border-color);" title="Command palette (⌘⇧P / Ctrl+Shift+P)">
            ⌘⇧P
          </button>
          <button onclick={handleLogout} class="text-xs" style="color: var(--text-danger);">Log out</button>
        </div>
      </div>
      <div class="flex gap-1">
        <button
          onclick={() => activeTab = "notes"}
          class="tab-btn"
          class:active={activeTab === "notes"}
        >
          Notes
        </button>
        <button
          onclick={() => activeTab = "media"}
          class="tab-btn"
          class:active={activeTab === "media"}
        >
          Media
        </button>
      </div>
    </div>
    {#if activeTab === "notes"}
      <div class="px-3 pt-2">
        <input
          bind:this={searchInputEl}
          value={searchQuery}
          oninput={handleSearchInput}
          placeholder="Search notes... (⌘F)"
          class="w-full text-sm px-2 py-1.5 rounded outline-none"
          style="color: var(--text-primary); background: var(--bg-editor); border: 1px solid var(--border-input);"
        />
      </div>
      <button onclick={startCreate} class="new-note-btn">
        + New note
      </button>
    {/if}
    <nav class="sidebar-nav flex-1 overflow-y-auto p-2 space-y-1">
      {#if activeTab === "notes" && searchQuery}
        {#if searching}
          <p class="text-sm p-2" style="color: var(--text-tertiary);">Searching...</p>
        {:else if searchResults.length === 0}
          <p class="text-sm p-2" style="color: var(--text-tertiary);">No results</p>
        {:else}
          {#each searchResults as result}
            <button
              onclick={() => { clearSearch(); selectNote(result.slug); }}
              class="note-btn text-left"
            >
              <div class="font-medium truncate">{@html result.title_highlight || result.title}</div>
              {#if result.content_snippet}
                <div class="text-xs mt-1 line-clamp-2" style="color: var(--text-secondary);">{@html result.content_snippet}</div>
              {/if}
              <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">{formatDate(result.updated_at)}</div>
            </button>
          {/each}
        {/if}
      {:else if activeTab === "notes" && loading}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">Loading...</p>
      {:else if activeTab === "notes" && notes.length === 0}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">No notes yet</p>
      {:else if activeTab === "notes"}
        {#each notes as note}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            role="none"
            class="note-btn-wrapper"
            class:active={selected?.slug === note.slug}
            oncontextmenu={(e) => handleCtxMenu(e, note)}
          >
            {#if renamingSlug === note.slug}
              <input
                bind:value={renameValue}
                onkeydown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                  if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
                }}
                onblur={commitRename}
                use:focusInput
                class="w-full text-sm px-1 py-0.5 rounded outline-none"
                style="color: var(--text-primary); background: var(--bg-editor); border: 1px solid var(--border-input);"
              />
            {:else}
              <button
                onclick={() => selectNote(note.slug)}
                class="note-btn"
              >
                <div class="font-medium truncate">{note.title}</div>
                <div class="text-xs" style="color: var(--text-secondary);">{formatDate(note.updated_at)}</div>
                {#if note.tags.length > 0}
                  <div class="flex gap-1 mt-1 flex-wrap">
                    {#each note.tags as tag}
                      <span class="text-xs px-1.5 py-0.5 rounded bg-tag" style="color: var(--text-secondary);">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    </nav>

    <!-- Theme switcher -->
    <div class="p-3 border-t" style="border-color: var(--border-color);">
      <div class="flex flex-wrap gap-1.5">
        <button onclick={() => { theme.setTheme("light"); currentTheme = "light"; }} class="theme-dot" class:active={currentTheme === "light"} style="background: #ffffff;" title="Light"></button>
        <button onclick={() => { theme.setTheme("dark"); currentTheme = "dark"; }} class="theme-dot" class:active={currentTheme === "dark"} style="background: #25262b;" title="Dark"></button>
        <button onclick={() => { theme.setTheme("sepia"); currentTheme = "sepia"; }} class="theme-dot" class:active={currentTheme === "sepia"} style="background: #f4ecd8;" title="Sepia"></button>
        <button onclick={() => { theme.setTheme("nord"); currentTheme = "nord"; }} class="theme-dot" class:active={currentTheme === "nord"} style="background: #3b4252;" title="Nord"></button>
        <button onclick={() => { theme.setTheme("monokai"); currentTheme = "monokai"; }} class="theme-dot" class:active={currentTheme === "monokai"} style="background: #272822;" title="Monokai"></button>
        <button onclick={() => { theme.setTheme("tokyo-night"); currentTheme = "tokyo-night"; }} class="theme-dot" class:active={currentTheme === "tokyo-night"} style="background: #1a1b26;" title="Tokyo Night"></button>
      </div>
    </div>
  </aside>

  <!-- Main area -->
  <main class="flex-1 flex flex-col min-h-0" style="background: var(--bg-page);">
    {#if activeTab === "media"}
      <MediaGallery />
    {:else if selected || creating}
      <div class="flex-1 flex flex-col min-h-0 p-4 gap-2">
        <input
          value={editTitle}
          oninput={(e) => { editTitle = (e.target as HTMLInputElement).value; markDirty(); }}
          placeholder="Note title"
          class="text-2xl font-bold border-b pb-2 outline-none"
          style="color: var(--text-primary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
        />
        <input
          value={editTags}
          oninput={(e) => { editTags = (e.target as HTMLInputElement).value; markDirty(); }}
          placeholder="Tags (comma separated)"
          class="text-sm outline-none border-b pb-2"
          style="color: var(--text-secondary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
        />
        <MarkdownEditor
          content={editContent}
          noteId={selected?.id ?? ""}
          insertMediaMd={mediaToInsertMd}
          insertMediaKey={mediaInsertKey}
          onContentChange={(md) => { editContent = md; markDirty(); }}
          onOpenMediaPicker={openMediaPicker}
          onUploadComplete={() => { if (selected?.id) loadNoteMedia(selected.id); }}
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
                    onclick={() => removeNoteMedia(m)}
                    class="text-xs px-1 rounded"
                    style="color: var(--text-danger); border: 1px solid var(--border-color); background: var(--bg-editor); cursor: pointer;"
                    title="Remove from note"
                  >&times;</button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if selected?.backlinks && selected.backlinks.length > 0}
          <div class="border-t pt-2 mt-4" style="border-color: var(--border-color);">
            <p class="text-xs mb-1" style="color: var(--text-secondary);">Linked from:</p>
            {#each selected.backlinks as bl}
              <button
                onclick={() => selectNote(bl.slug)}
                class="text-sm hover:underline"
                style="color: var(--text-link);"
              >
                {bl.title}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center">
        <p style="color: var(--text-tertiary);">Select or create a note</p>
      </div>
    {/if}
  </main>
</div>

<!-- Context menu backdrop -->
{#if ctxMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="none"
    class="fixed inset-0 z-40"
    onclick={closeCtxMenu}
    oncontextmenu={(e) => e.preventDefault()}
  ></div>

  <!-- Context menu -->
  <div
    class="fixed z-50 rounded border shadow-lg py-1 min-w-[140px]"
    style="left: {ctxMenu.x}px; top: {ctxMenu.y}px; background: var(--bg-sidebar); border-color: var(--border-color);"
  >
    <button
      onclick={startCreate}
      class="ctx-menu-item"
    >
      New note
    </button>
    {#if ctxMenuNote}
      <button
        onclick={() => startRename(ctxMenuNote!)}
        class="ctx-menu-item"
      >
        Rename
      </button>
      <div class="border-t" style="border-color: var(--border-color);"></div>
      <button
        onclick={() => deleteNote(ctxMenuNote!)}
        class="ctx-menu-item"
        style="color: var(--text-danger);"
      >
        Delete
      </button>
    {/if}
  </div>
{/if}

{#if showMediaPicker}
  <MediaPicker
    onClose={() => showMediaPicker = false}
    onSelect={handleMediaSelect}
  />
{/if}

<CommandPalette
  open={cmdPaletteOpen}
  onClose={() => cmdPaletteOpen = false}
  onCreateNote={startCreate}
  onSave={save}
  onFocusSearch={focusSearch}
  onSwitchTab={(tab) => activeTab = tab}
  onSetTheme={(t) => { theme.setTheme(t); currentTheme = t; }}
  onLogout={handleLogout}
/>

<style>
  .note-btn-wrapper {
    border-radius: 0.25rem;
  }
  .note-btn-wrapper.active {
    background: var(--bg-note-active);
  }
  .ctx-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--text-primary);
  }
  .ctx-menu-item:hover {
    background: var(--bg-note-hover);
  }
  .tab-btn {
    flex: 1;
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
    border-radius: 0.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--text-secondary);
    text-align: center;
  }
  .tab-btn.active {
    background: var(--bg-note-active);
    color: var(--text-primary);
    font-weight: 600;
  }
  .tab-btn:hover:not(.active) {
    background: var(--bg-note-hover);
  }
</style>
