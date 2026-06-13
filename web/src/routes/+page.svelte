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
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import { PanelLeftOpen, PanelLeftClose, Settings, LogOut, X } from "@lucide/svelte";
  import * as prefs from "$lib/preferences.svelte";

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
    backlinks: { title: string; slug: string }[];
  }

  let notes = $state<NoteSummary[]>([]);
  let loading = $state(true);

  let tabs = $state<TabSession[]>([]);
  let activeTabId = $state<string | null>(null);
  let tabIdCounter = 0;
  function nextTabId() { return `tab-${++tabIdCounter}`; }

  let activeTab = $derived(tabs.find((t) => t.id === activeTabId) ?? null);

  let sidebarTab = $state<"notes" | "media">("notes");
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

  let sortedNotes = $derived(
    [...notes].sort((a, b) => {
      const sort = prefs.getPreferences().noteSort;
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "created") return a.created_at.localeCompare(b.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    }),
  );

  let cmdPaletteOpen = $state(false);
  let sidebarCollapsed = $state(false);
  let settingsOpen = $state(false);

  let saveDebounce: ReturnType<typeof setTimeout> | null = null;

  // --- Tab management ---

  async function switchToTab(tabId: string) {
    if (activeTabId === tabId) return;
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    if (activeTab?.dirty) await saveActiveTab();
    activeTabId = tabId;
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.noteId) loadNoteMedia(tab.noteId);
  }

  async function openTabForNote(slug: string) {
    const existing = tabs.find((t) => t.slug === slug);
    if (existing) {
      await switchToTab(existing.id);
      return;
    }
    if (activeTab?.dirty) await saveActiveTab();
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    const res = await api(`/api/notes/${slug}`);
    if (res.ok) {
      const note: NoteDetail = await res.json();
      const tab: TabSession = {
        id: nextTabId(),
        noteId: note.id,
        slug: note.slug,
        title: note.title,
        content: note.content,
        tags: note.tags.join(", "),
        dirty: false,
        savedTitle: note.title,
        savedContent: note.content,
        savedTags: note.tags.join(", "),
        backlinks: note.backlinks,
      };
      tabs = [...tabs, tab];
      activeTabId = tab.id;
      loadNoteMedia(note.id);
    }
  }

  async function newTab() {
    if (activeTab?.dirty) await saveActiveTab();
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    const tab: TabSession = {
      id: nextTabId(),
      noteId: null,
      slug: "",
      title: "",
      content: "",
      tags: "",
      dirty: false,
      savedTitle: "",
      savedContent: "",
      savedTags: "",
      backlinks: [],
    };
    tabs = [...tabs, tab];
    activeTabId = tab.id;
    closeCtxMenu();
    noteMedia = [];
  }

  async function closeTab(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.dirty) await saveTab(tab);
    const idx = tabs.indexOf(tab);
    const wasActive = activeTabId === tabId;
    tabs = tabs.filter((t) => t.id !== tabId);
    if (wasActive) {
      if (tabs.length === 0) {
        activeTabId = null;
        noteMedia = [];
      } else {
        const nextIdx = Math.min(idx, tabs.length - 1);
        activeTabId = tabs[nextIdx].id;
        const nextTab = tabs[nextIdx];
        if (nextTab?.noteId) loadNoteMedia(nextTab.noteId);
        else noteMedia = [];
      }
    }
  }

  function closeActiveTab() {
    if (activeTabId) closeTab(activeTabId);
  }

  async function nextTab() {
    if (tabs.length < 2) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const nextIdx = (idx + 1) % tabs.length;
    await switchToTab(tabs[nextIdx].id);
  }

  async function prevTab() {
    if (tabs.length < 2) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const prevIdx = (idx - 1 + tabs.length) % tabs.length;
    await switchToTab(tabs[prevIdx].id);
  }

  // --- Note management ---

  async function saveTab(tab: TabSession) {
    if (!tab.dirty && tab.noteId) return;
    const tags = mergeTabTags(tab);
    if (!tab.noteId) {
      const res = await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: tab.title || "Untitled",
          content: tab.content,
          tags,
        }),
      });
      if (res.ok) {
        const note: NoteDetail = await res.json();
        tab.noteId = note.id;
        tab.slug = note.slug;
        tab.backlinks = note.backlinks;
        tab.savedTitle = tab.title;
        tab.savedContent = tab.content;
        tab.savedTags = tab.tags;
        tab.dirty = false;
        await loadNotes();
      }
    } else {
      await api(`/api/notes/${tab.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          title: tab.title,
          content: tab.content,
          tags,
        }),
      });
      tab.savedTitle = tab.title;
      tab.savedContent = tab.content;
      tab.savedTags = tab.tags;
      tab.dirty = false;
      await loadNotes();
    }
  }

  function saveActiveTab() {
    if (!activeTab) return;
    return saveTab(activeTab);
  }

  function markTabDirty() {
    if (!activeTab) return;
    activeTab.dirty = true;
    if (saveDebounce) clearTimeout(saveDebounce);
    const tid = activeTab.id;
    saveDebounce = setTimeout(() => {
      const t = tabs.find((t) => t.id === tid);
      if (t?.dirty) saveTab(t);
    }, 500);
  }

  function mergeTabTags(tab: TabSession): string[] {
    const manual = tab.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const fromContent = extractTagsFromContent(tab.content);
    return [...new Set([...manual, ...fromContent])];
  }

  function syncTabTagsField(tab: TabSession) {
    const autoTags = extractTagsFromContent(tab.content);
    const manualOnly = tab.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !autoTags.includes(t.toLowerCase()));
    const merged = [...new Set([...autoTags, ...manualOnly])];
    tab.tags = merged.join(", ");
  }

  function extractTagsFromContent(md: string): string[] {
    return [...md.matchAll(/(?:^|\s)#([\w-]+)/g)]
      .map((m) => m[1].toLowerCase())
      .filter((t) => !/^\d/.test(t));
  }

  // --- Legacy wrappers for CommandPalette compatibility ---

  function save() { saveActiveTab(); }
  function startCreate() { newTab(); }

  // --- Sidebar note management ---

  onMount(() => {
    loadNotes();

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
            newTab();
            return;
          case "KeyS":
            e.preventDefault();
            e.stopPropagation();
            saveActiveTab();
            return;
          case "KeyF":
            e.preventDefault();
            e.stopPropagation();
            focusSearch();
            return;
          case "KeyG":
            e.preventDefault();
            e.stopPropagation();
            sidebarTab = sidebarTab === "media" ? "notes" : "media";
            return;
        }
      }
      if (mod && !e.shiftKey && e.code === "KeyW") {
        e.preventDefault();
        e.stopPropagation();
        closeActiveTab();
        return;
      }
      if (e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey && e.code === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        nextTab();
        return;
      }
      if (e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey && e.code === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        prevTab();
        return;
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
      if (mod && !e.shiftKey && e.code === "Backslash") {
        e.preventDefault();
        e.stopPropagation();
        sidebarCollapsed = !sidebarCollapsed;
      }
    }

    document.addEventListener("keydown", onKeydown, { capture: true });

    return () => {
      if (saveDebounce) clearTimeout(saveDebounce);
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
    if (activeTab?.noteId) {
      api(`/api/media/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ note_id: activeTab.noteId }),
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
    if (!activeTab) return;
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    activeTab.content = activeTab.content.replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)|\\[.*?\\]\\(${escaped}\\)`, "g"), "");
    if (activeTab.noteId) loadNoteMedia(activeTab.noteId);
  }

  async function selectNote(slug: string) {
    await openTabForNote(slug);
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
    const openTab = tabs.find((t) => t.slug === slug);
    if (openTab) {
      openTab.title = val;
      openTab.savedTitle = val;
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
    const openTab = tabs.find((t) => t.slug === note.slug);
    if (openTab) await closeTab(openTab.id);
    await loadNotes();
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
    class="sidebar border-r flex flex-col bg-sidebar"
    class:sidebar-collapsed={sidebarCollapsed}
    style="border-color: var(--border-color);"
    oncontextmenu={(e) => handleCtxMenu(e)}
  >
    <div class="p-3 border-b flex flex-col gap-2" style="border-color: var(--border-color);">
      <div class="flex items-center justify-between">
        {#if sidebarCollapsed}
          <button
            onclick={() => sidebarCollapsed = false}
            class="cursor-pointer hover:opacity-80 p-1"
            style="color: var(--text-secondary);"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        {:else}
          <h1 class="font-bold text-lg" style="color: var(--text-primary);">openslate</h1>
          <div class="flex items-center gap-2">
            <button onclick={() => cmdPaletteOpen = true} class="text-xs px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80" style="color: var(--text-tertiary); border-color: var(--border-color);" title="Command palette (⌘⇧P / Ctrl+Shift+P)">
              ⌘⇧P
            </button>
            <button
              onclick={() => sidebarCollapsed = true}
              class="cursor-pointer hover:opacity-80 p-1"
              style="color: var(--text-tertiary);"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        {/if}
      </div>
      {#if !sidebarCollapsed}
      <div class="flex gap-1">
        <button
          onclick={() => sidebarTab = "notes"}
          class="tab-btn"
          class:active={sidebarTab === "notes"}
        >
          Notes
        </button>
        <button
          onclick={() => sidebarTab = "media"}
          class="tab-btn"
          class:active={sidebarTab === "media"}
        >
          Media
        </button>
      </div>
      {/if}
    </div>
    {#if !sidebarCollapsed}
    {#if sidebarTab === "notes"}
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
      <button onclick={newTab} class="new-note-btn">
        + New note
      </button>
    {/if}
    <nav class="sidebar-nav flex-1 overflow-y-auto p-2 space-y-1">
      {#if sidebarTab === "notes" && searchQuery}
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
              <div class="font-medium break-words">{@html result.title_highlight || result.title}</div>
              {#if result.content_snippet}
                <div class="text-xs mt-1 line-clamp-2" style="color: var(--text-secondary);">{@html result.content_snippet}</div>
              {/if}
              <div class="text-xs mt-0.5" style="color: var(--text-tertiary);">{formatDate(result.updated_at)}</div>
            </button>
          {/each}
        {/if}
      {:else if sidebarTab === "notes" && loading}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">Loading...</p>
      {:else if sidebarTab === "notes" && sortedNotes.length === 0}
        <p class="text-sm p-2" style="color: var(--text-tertiary);">No notes yet</p>
      {:else if sidebarTab === "notes"}
        {#each sortedNotes as note}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            role="none"
            class="note-btn-wrapper"
            class:active={activeTab?.slug === note.slug}
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
                <div class="font-medium break-words whitespace-normal">{note.title}</div>
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

    <!-- Bottom bar -->
    <div class="p-3 border-t" style="border-color: var(--border-color);">
      <div class="flex items-center justify-between">
        <button
          onclick={() => settingsOpen = true}
          class="flex items-center gap-1.5 text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80"
          style="color: var(--text-secondary);"
          title="Settings"
        >
          <Settings size={14} />
          Settings
        </button>
        <button onclick={handleLogout} class="text-xs cursor-pointer hover:opacity-80" style="color: var(--text-danger);">Log out</button>
      </div>
    </div>
    {/if}

    {#if sidebarCollapsed}
      <div class="mt-auto p-2 border-t flex flex-col items-center gap-3" style="border-color: var(--border-color);">
        <button
          onclick={() => settingsOpen = true}
          class="cursor-pointer hover:opacity-80 p-1"
          style="color: var(--text-secondary);"
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <button
          onclick={handleLogout}
          class="cursor-pointer hover:opacity-80 p-1"
          style="color: var(--text-danger);"
          title="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    {/if}
  </aside>

  <!-- Main area -->
  <main class="flex-1 flex flex-col min-h-0" style="background: var(--bg-page);">
    {#if sidebarTab === "media"}
      <MediaGallery />
    {:else if tabs.length > 0}
      <!-- Tab bar -->
      <div class="tab-bar">
        {#each tabs as tab}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            role="none"
            class="tab-item"
            class:active={tab.id === activeTabId}
            onclick={() => switchToTab(tab.id)}
            onmousedown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
            title={tab.title || "Untitled"}
          >
            {#if tab.dirty}
              <span class="tab-dirty visible"></span>
            {/if}
            <span class="tab-title">{tab.title || "Untitled"}</span>
            <button
              class="tab-close"
              onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        {/each}
      </div>

      {#if activeTab}
        <div class="flex-1 flex flex-col min-h-0 p-4 gap-2">
          <input
            value={activeTab.title}
            oninput={(e) => { activeTab.title = (e.target as HTMLInputElement).value; markTabDirty(); }}
            placeholder="Note title"
            class="text-2xl font-bold border-b pb-2 outline-none"
            style="color: var(--text-primary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
          />
          <input
            value={activeTab.tags}
            oninput={(e) => { activeTab.tags = (e.target as HTMLInputElement).value; markTabDirty(); }}
            placeholder="Tags (comma separated)"
            class="text-sm outline-none border-b pb-2"
            style="color: var(--text-secondary); caret-color: var(--text-primary); border-color: var(--border-color); background: transparent;"
          />
          <MarkdownEditor
            content={activeTab.content}
            noteId={activeTab.noteId ?? ""}
            insertMediaMd={mediaToInsertMd}
            insertMediaKey={mediaInsertKey}
            onContentChange={(md) => { activeTab.content = md; syncTabTagsField(activeTab); markTabDirty(); }}
            onOpenMediaPicker={openMediaPicker}
            onUploadComplete={() => { if (activeTab?.noteId) loadNoteMedia(activeTab.noteId); }}
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
          {#if activeTab.backlinks && activeTab.backlinks.length > 0}
            <div class="border-t pt-2 mt-4" style="border-color: var(--border-color);">
              <p class="text-xs mb-1" style="color: var(--text-secondary);">Linked from:</p>
              {#each activeTab.backlinks as bl}
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
      {/if}
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
      onclick={newTab}
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
  onCreateNote={newTab}
  onSave={saveActiveTab}
  onFocusSearch={focusSearch}
  onSwitchTab={(tab) => sidebarTab = tab}
  onSetTheme={(t) => { theme.setTheme(t); }}
  onLogout={handleLogout}
  onOpenSettings={() => settingsOpen = true}
/>

<SettingsModal
  open={settingsOpen}
  onClose={() => settingsOpen = false}
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
