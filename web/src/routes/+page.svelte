<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import * as auth from "$lib/auth.svelte";
  import * as theme from "$lib/theme.svelte";
  import { goto } from "$app/navigation";
  import TiptapEditor from "$lib/components/TiptapEditor.svelte";

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

  let ctxMenu = $state<{ x: number; y: number; note?: NoteSummary } | null>(null);
  let ctxMenuNote = $state<NoteSummary | null>(null);
  let renamingSlug = $state<string | null>(null);
  let renameValue = $state("");

  let searchQuery = $state("");
  let searchResults = $state<SearchResult[]>([]);
  let searching = $state(false);
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    loadNotes();

    const interval = setInterval(() => {
      if (dirty) save();
    }, 2000);

    return () => clearInterval(interval);
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

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
      e.preventDefault();
      focusSearch();
    }
    if (e.key === "Escape") {
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

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-screen">
  <!-- Sidebar -->
  <aside
    class="w-64 border-r flex flex-col bg-sidebar"
    style="border-color: var(--border-color);"
    oncontextmenu={(e) => handleCtxMenu(e)}
  >
    <div class="p-3 border-b flex items-center justify-between" style="border-color: var(--border-color);">
      <h1 class="font-bold text-lg" style="color: var(--text-primary);">openslate</h1>
      <button onclick={handleLogout} class="text-xs" style="color: var(--text-danger);">Log out</button>
    </div>
    <div class="px-3 pt-2">
      <input
        bind:this={searchInputEl}
        value={searchQuery}
        oninput={handleSearchInput}
        placeholder="Search notes... (⌘⇧F)"
        class="w-full text-sm px-2 py-1.5 rounded outline-none"
        style="color: var(--text-primary); background: var(--bg-editor); border: 1px solid var(--border-input);"
      />
    </div>
    <button onclick={startCreate} class="new-note-btn">
      + New note
    </button>
    <nav class="sidebar-nav flex-1 overflow-y-auto p-2 space-y-1">
      {#if searchQuery}
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
      {:else if loading}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">Loading...</p>
      {:else if notes.length === 0}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">No notes yet</p>
      {:else}
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
    {#if selected || creating}
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
        <TiptapEditor content={editContent} onContentChange={(md) => { editContent = md; markDirty(); }} />
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
</style>
