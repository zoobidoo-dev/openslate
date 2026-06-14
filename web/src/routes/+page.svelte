<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import * as auth from "$lib/auth.svelte";
  import * as theme from "$lib/theme.svelte";
  import { goto } from "$app/navigation";
  import MediaGallery from "$lib/components/MediaGallery.svelte";
  import MediaPicker from "$lib/components/MediaPicker.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import SplitLayout from "$lib/components/SplitLayout.svelte";
  import { PanelLeftOpen, PanelLeftClose, Settings, LogOut } from "@lucide/svelte";
  import * as prefs from "$lib/preferences.svelte";
  import type { NoteSummary, NoteDetail, SearchResult, TabSession, MediaItem, PaneData, LayoutNode } from "$lib/types";

  let notes = $state<NoteSummary[]>([]);
  let loading = $state(true);

  let nodeIdCounter = 0;
  function nextNodeId() { return `node-${++nodeIdCounter}`; }

  const rootPaneId = nextNodeId();
  let panes = $state<Record<string, PaneData>>({
    [rootPaneId]: { tabs: [], activeTabId: null, noteMedia: [] },
  });
  let layout = $state<LayoutNode>({ id: rootPaneId, type: "pane" });
  let focusedPaneId = $state<string>(rootPaneId);

  function getFocusedPane(): PaneData {
    return panes[focusedPaneId] ?? { tabs: [], activeTabId: null, noteMedia: [] };
  }

  function getFocusedActiveTab(): TabSession | null {
    const pane = getFocusedPane();
    return pane.tabs.find(t => t.id === pane.activeTabId) ?? null;
  }

  let sidebarTab = $state<"notes" | "media">("notes");
  let showMediaPicker = $state(false);
  let mediaInsertKey = $state(0);
  let mediaToInsertMd = $state("");

  let ctxMenu = $state<{ x: number; y: number; note?: NoteSummary } | null>(null);
  let ctxMenuNote = $state<NoteSummary | null>(null);
  let renamingSlug = $state<string | null>(null);
  let renameValue = $state("");
  let tabCtxMenu = $state<{ x: number; y: number; paneId: string; tabId: string } | null>(null);

  let searchQuery = $state("");
  let searchResults = $state<SearchResult[]>([]);
  let searching = $state(false);
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let searchDebounce: ReturnType<typeof setTimeout> | null = null;

  let cmdPaletteOpen = $state(false);
  let sidebarCollapsed = $state(false);
  let settingsOpen = $state(false);

  let saveDebounce: ReturnType<typeof setTimeout> | null = null;

  let sortedNotes = $derived(
    [...notes].sort((a, b) => {
      const sort = prefs.getPreferences().noteSort;
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "created") return a.created_at.localeCompare(b.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    }),
  );

  // --- Layout tree helpers ---

  function collectPaneIds(node: LayoutNode): string[] {
    if (node.type === "pane") return [node.id];
    return node.children.flatMap(c => collectPaneIds(c));
  }

  function replacePaneNode(node: LayoutNode, paneId: string, replacement: LayoutNode): LayoutNode {
    if (node.type === "pane" && node.id === paneId) return replacement;
    if (node.type === "split") {
      return {
        ...node,
        children: node.children.map(c => replacePaneNode(c, paneId, replacement)) as [LayoutNode, LayoutNode],
      };
    }
    return node;
  }

  function removePaneNode(node: LayoutNode, paneId: string): LayoutNode | null {
    if (node.type === "split") {
      const idx = node.children.findIndex(c => c.type === "pane" && c.id === paneId);
      if (idx >= 0) return node.children[1 - idx];
      const newChildren = node.children.map(c => {
        const result = removePaneNode(c, paneId);
        return result ?? c;
      }) as [LayoutNode, LayoutNode];
      return { ...node, children: newChildren };
    }
    return node.id === paneId ? null : node;
  }

  function updateRatio(node: LayoutNode, splitId: string, ratio: number): LayoutNode {
    if (node.type === "split" && node.id === splitId) return { ...node, ratio };
    if (node.type === "split") {
      return {
        ...node,
        children: node.children.map(c => updateRatio(c, splitId, ratio)) as [LayoutNode, LayoutNode],
      };
    }
    return node;
  }

  // --- Pane operations ---

  function focusPane(paneId: string) {
    focusedPaneId = paneId;
  }

  function splitFocusedPane(direction: "vertical" | "horizontal") {
    const newPaneId = nextNodeId();
    const splitId = nextNodeId();
    layout = replacePaneNode(layout, focusedPaneId, {
      id: splitId,
      type: "split",
      direction,
      ratio: 50,
      children: [
        { id: focusedPaneId, type: "pane" },
        { id: newPaneId, type: "pane" },
      ],
    });
    panes = { ...panes, [newPaneId]: { tabs: [], activeTabId: null, noteMedia: [] } };
    focusedPaneId = newPaneId;
  }

  function closeFocusedTab() {
    const pane = getFocusedPane();
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab) handlePaneCloseTab(focusedPaneId, tab.id);
  }

  function closeFocusedPane() {
    const ids = collectPaneIds(layout);
    if (ids.length <= 1) return;
    const newLayout = removePaneNode(layout, focusedPaneId);
    if (!newLayout) return;
    layout = newLayout;
    const newPanes = { ...panes };
    delete newPanes[focusedPaneId];
    panes = newPanes;
    focusedPaneId = collectPaneIds(layout)[0];
  }

  function maybeCloseEmptyPane(paneId: string) {
    const pane = panes[paneId];
    if (!pane || pane.tabs.length > 0) return;
    const ids = collectPaneIds(layout);
    if (ids.length <= 1) return;
    const newLayout = removePaneNode(layout, paneId);
    if (!newLayout) return;
    layout = newLayout;
    const newPanes = { ...panes };
    delete newPanes[paneId];
    panes = newPanes;
    if (focusedPaneId === paneId) {
      focusedPaneId = collectPaneIds(layout)[0];
    }
  }

  function focusPaneInDirection(dir: "up" | "down" | "left" | "right") {
    const ids = collectPaneIds(layout);
    const idx = ids.indexOf(focusedPaneId);
    if (idx < 0) return;
    if (dir === "left" || dir === "up") {
      focusedPaneId = ids[(idx - 1 + ids.length) % ids.length];
    } else {
      focusedPaneId = ids[(idx + 1) % ids.length];
    }
  }

  // --- Tab management (focused-pane scoped) ---

  function handlePaneSwitchTab(paneId: string, tabId: string) {
    if (paneId !== focusedPaneId && tabId === "") {
      focusPane(paneId);
      return;
    }
    if (paneId !== focusedPaneId) {
      focusPane(paneId);
    }
    const pane = panes[paneId];
    if (!pane || pane.activeTabId === tabId) return;
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    const prevTab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (prevTab?.dirty) savePaneTab(paneId, prevTab);
    pane.activeTabId = tabId;
    const tab = pane.tabs.find(t => t.id === tabId);
    if (tab?.noteId) loadPaneNoteMedia(paneId, tab.noteId);
    else pane.noteMedia = [];
  }

  async function openTabForNote(slug: string) {
    const pane = getFocusedPane();
    const existing = pane.tabs.find(t => t.slug === slug);
    if (existing) {
      pane.activeTabId = existing.id;
      if (existing.noteId) loadPaneNoteMedia(focusedPaneId, existing.noteId);
      return;
    }
    const prevTab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (prevTab?.dirty) await savePaneTab(focusedPaneId, prevTab);
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    const res = await api(`/api/notes/${slug}`);
    if (res.ok) {
      const note: NoteDetail = await res.json();
      const tab: TabSession = {
        id: nextNodeId(),
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
      pane.tabs = [...pane.tabs, tab];
      pane.activeTabId = tab.id;
      loadPaneNoteMedia(focusedPaneId, note.id);
    }
  }

  function newTab() {
    const pane = getFocusedPane();
    const prevTab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (prevTab?.dirty) savePaneTab(focusedPaneId, prevTab);
    if (saveDebounce) { clearTimeout(saveDebounce); saveDebounce = null; }
    const tab: TabSession = {
      id: nextNodeId(),
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
    pane.tabs = [...pane.tabs, tab];
    pane.activeTabId = tab.id;
    pane.noteMedia = [];
    closeCtxMenu();
  }

  async function handlePaneCloseTab(paneId: string, tabId: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === tabId);
    if (!tab) return;
    if (tab.dirty) await savePaneTab(paneId, tab);
    const idx = pane.tabs.indexOf(tab);
    const wasActive = pane.activeTabId === tabId;
    pane.tabs = pane.tabs.filter(t => t.id !== tabId);
    if (wasActive) {
      if (pane.tabs.length === 0) {
        pane.activeTabId = null;
        pane.noteMedia = [];
      } else {
        const nextIdx = Math.min(idx, pane.tabs.length - 1);
        pane.activeTabId = pane.tabs[nextIdx].id;
        const nextTab = pane.tabs[nextIdx];
        if (nextTab?.noteId) loadPaneNoteMedia(paneId, nextTab.noteId);
        else pane.noteMedia = [];
      }
    }
    maybeCloseEmptyPane(paneId);
  }

  function handlePaneReorderTabs(paneId: string, newTabs: TabSession[]) {
    const pane = panes[paneId];
    if (!pane) return;
    pane.tabs = newTabs;
  }

  function handleMoveTab(tabId: string, fromPaneId: string, toPaneId: string, insertIdx: number) {
    const fromPane = panes[fromPaneId];
    const toPane = panes[toPaneId];
    if (!fromPane || !toPane) return;

    const tab = fromPane.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const wasActive = fromPane.activeTabId === tabId;
    fromPane.tabs = fromPane.tabs.filter(t => t.id !== tabId);

    if (wasActive) {
      if (fromPane.tabs.length > 0) {
        fromPane.activeTabId = fromPane.tabs[0].id;
        const nextTab = fromPane.tabs[0];
        if (nextTab?.noteId) loadPaneNoteMedia(fromPaneId, nextTab.noteId);
        else fromPane.noteMedia = [];
      } else {
        fromPane.activeTabId = null;
        fromPane.noteMedia = [];
      }
    }

    toPane.tabs = [
      ...toPane.tabs.slice(0, insertIdx),
      tab,
      ...toPane.tabs.slice(insertIdx),
    ];
    toPane.activeTabId = tabId;
    if (tab.noteId) loadPaneNoteMedia(toPaneId, tab.noteId);
    else toPane.noteMedia = [];

    focusedPaneId = toPaneId;
    maybeCloseEmptyPane(fromPaneId);
  }

  function handlePaneTitleChange(paneId: string, title: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab) { tab.title = title; markPaneTabDirty(paneId); }
  }

  function handlePaneTagsChange(paneId: string, tags: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab) { tab.tags = tags; markPaneTabDirty(paneId); }
  }

  function handlePaneContentChange(paneId: string, md: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (!tab) return;
    tab.content = md;
    syncTabTagsField(tab);
    markPaneTabDirty(paneId);
  }

  function handlePaneRemoveMedia(paneId: string, m: MediaItem) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (!tab) return;
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${m.id}/file`;
    api(`/api/media/${m.id}`, { method: "PUT", body: JSON.stringify({ note_id: "" }) });
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    tab.content = tab.content.replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)|\\[.*?\\]\\(${escaped}\\)`, "g"), "");
    if (tab.noteId) loadPaneNoteMedia(paneId, tab.noteId);
  }

  function handlePaneUploadComplete(paneId: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab?.noteId) loadPaneNoteMedia(paneId, tab.noteId);
  }

  async function savePaneTab(paneId: string, tab: TabSession) {
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
      const res = await api(`/api/notes/${tab.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          title: tab.title,
          content: tab.content,
          tags,
        }),
      });
      if (res.ok) {
        const note: NoteDetail = await res.json();
        tab.slug = note.slug;
        tab.title = note.title;
        tab.backlinks = note.backlinks;
        tab.savedTitle = tab.title;
        tab.savedContent = tab.content;
        tab.savedTags = tab.tags;
        tab.dirty = false;
      }
      await loadNotes();
    }
  }

  function markPaneTabDirty(paneId: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (!tab) return;
    tab.dirty = true;
    if (saveDebounce) clearTimeout(saveDebounce);
    const tid = tab.id;
    const pid = paneId;
    saveDebounce = setTimeout(() => {
      const p = panes[pid];
      if (!p) return;
      const t = p.tabs.find(t => t.id === tid);
      if (t?.dirty) savePaneTab(pid, t);
    }, 500);
  }

  function mergeTabTags(tab: TabSession): string[] {
    const manual = tab.tags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);
    const fromContent = extractTagsFromContent(tab.content);
    return [...new Set([...manual, ...fromContent])];
  }

  function syncTabTagsField(tab: TabSession) {
    const autoTags = extractTagsFromContent(tab.content);
    const manualOnly = tab.tags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)
      .filter(t => !autoTags.includes(t.toLowerCase()));
    tab.tags = [...new Set([...autoTags, ...manualOnly])].join(", ");
  }

  function extractTagsFromContent(md: string): string[] {
    return [...md.matchAll(/(?:^|\s)#([\w-]+)/g)]
      .map(m => m[1].toLowerCase())
      .filter(t => !/^\d/.test(t));
  }

  // --- Legacy wrappers ---

  function save() { 
    const pane = getFocusedPane();
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab) savePaneTab(focusedPaneId, tab);
  }
  function startCreate() { newTab(); }
  function saveActiveTab() { save(); }

  // --- Sidebar note management ---

  onMount(() => {
    loadNotes();

    function onKeydown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd+Shift+<key> shortcuts
      if (mod && e.shiftKey && !e.altKey) {
        switch (e.code) {
          case "KeyP":
            e.preventDefault(); e.stopImmediatePropagation();
            cmdPaletteOpen = !cmdPaletteOpen;
            return;
          case "KeyK":
            e.preventDefault(); e.stopImmediatePropagation();
            newTab();
            return;
          case "KeyS":
            e.preventDefault(); e.stopImmediatePropagation();
            save();
            return;
          case "KeyF":
            e.preventDefault(); e.stopImmediatePropagation();
            focusSearch();
            return;
          case "KeyG":
            e.preventDefault(); e.stopImmediatePropagation();
            sidebarTab = sidebarTab === "media" ? "notes" : "media";
            return;
          case "Backslash":
            e.preventDefault(); e.stopImmediatePropagation();
            splitFocusedPane("vertical");
            return;
        }
      }

      // Alt+W → close active tab (browsers reserve Ctrl/Cmd+W, so Alt+W is the reliable web shortcut)
      if (e.altKey && !e.shiftKey && !mod && e.code === "KeyW") {
        e.preventDefault(); e.stopImmediatePropagation();
        closeFocusedTab();
        return;
      }

      // Ctrl/Cmd+W → close active tab (may work in some browser/OS configurations, kept as fallback)
      if (mod && !e.shiftKey && !e.altKey && e.code === "KeyW") {
        e.preventDefault(); e.stopImmediatePropagation();
        closeFocusedTab();
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab → cycle tabs
      if (e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey && e.code === "Tab") {
        e.preventDefault(); e.stopImmediatePropagation();
        nextTab();
        return;
      }
      if (e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey && e.code === "Tab") {
        e.preventDefault(); e.stopImmediatePropagation();
        prevTab();
        return;
      }

      // Ctrl/Cmd+\ → toggle sidebar
      if (mod && !e.shiftKey && !e.altKey && e.code === "Backslash") {
        e.preventDefault(); e.stopImmediatePropagation();
        sidebarCollapsed = !sidebarCollapsed;
        return;
      }

      // Cmd/Ctrl+K → chord prefix for pane operations
      if (mod && !e.shiftKey && !e.altKey && e.code === "KeyK") {
        e.preventDefault(); e.stopImmediatePropagation();
        const onChord = (ev: KeyboardEvent) => {
          document.removeEventListener("keydown", onChord);
          if (ev.key === "ArrowLeft")  { focusPaneInDirection("left"); return; }
          if (ev.key === "ArrowRight") { focusPaneInDirection("right"); return; }
          if (ev.key === "ArrowUp")    { focusPaneInDirection("up"); return; }
          if (ev.key === "ArrowDown")  { focusPaneInDirection("down"); return; }
          // Plain W → close active tab
          if (ev.code === "KeyW" && !ev.metaKey && !ev.ctrlKey && !ev.altKey && !ev.shiftKey) { closeFocusedTab(); return; }
          if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && !ev.altKey && ev.code === "KeyW") { closeFocusedPane(); return; }
          if ((ev.metaKey || ev.ctrlKey) && ev.shiftKey && !ev.altKey && ev.code === "Backslash") { splitFocusedPane("horizontal"); return; }
          if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && !ev.altKey && ev.code === "Backslash") { splitFocusedPane("vertical"); return; }
          if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && !ev.altKey && ev.code === "KeyS") { save(); return; }
        };
        document.addEventListener("keydown", onChord);
        return;
      }
      if (e.key === "Escape") {
        if (cmdPaletteOpen) { cmdPaletteOpen = false; return; }
        if (searchQuery) { clearSearch(); return; }
        closeCtxMenu();
        closeTabCtxMenu();
        if (renamingSlug) { renamingSlug = null; renameValue = ""; }
      }
    }

    document.addEventListener("keydown", onKeydown, { capture: true });

    return () => {
      if (saveDebounce) clearTimeout(saveDebounce);
      document.removeEventListener("keydown", onKeydown, { capture: true });
    };
  });

  function nextTab() {
    const pane = getFocusedPane();
    if (pane.tabs.length < 2) return;
    const idx = pane.tabs.findIndex(t => t.id === pane.activeTabId);
    const nextIdx = (idx + 1) % pane.tabs.length;
    handlePaneSwitchTab(focusedPaneId, pane.tabs[nextIdx].id);
  }

  function prevTab() {
    const pane = getFocusedPane();
    if (pane.tabs.length < 2) return;
    const idx = pane.tabs.findIndex(t => t.id === pane.activeTabId);
    const prevIdx = (idx - 1 + pane.tabs.length) % pane.tabs.length;
    handlePaneSwitchTab(focusedPaneId, pane.tabs[prevIdx].id);
  }

  function closeCtxMenu() {
    ctxMenu = null;
    ctxMenuNote = null;
  }

  function handleTabContextMenu(paneId: string, tabId: string, e: MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    tabCtxMenu = { x: e.clientX, y: e.clientY, paneId, tabId };
  }

  function closeTabCtxMenu() {
    tabCtxMenu = null;
  }

  async function closeAllTabsInPane(paneId: string) {
    const pane = panes[paneId];
    if (!pane) return;
    for (const tab of pane.tabs) {
      if (tab.dirty) await savePaneTab(paneId, tab);
    }
    pane.tabs = [];
    pane.activeTabId = null;
    pane.noteMedia = [];
    closeTabCtxMenu();
    maybeCloseEmptyPane(paneId);
  }

  async function closeOtherTabsInPane(paneId: string, keepTabId: string) {
    const pane = panes[paneId];
    if (!pane) return;
    const keepTab = pane.tabs.find(t => t.id === keepTabId);
    if (!keepTab) return;
    for (const tab of pane.tabs) {
      if (tab.id !== keepTabId && tab.dirty) await savePaneTab(paneId, tab);
    }
    pane.tabs = [keepTab];
    pane.activeTabId = keepTabId;
    if (keepTab.noteId) loadPaneNoteMedia(paneId, keepTab.noteId);
    else pane.noteMedia = [];
    closeTabCtxMenu();
  }

  function handleCtxMenu(e: MouseEvent, note?: NoteSummary) {
    e.preventDefault(); e.stopPropagation();
    ctxMenu = { x: e.clientX, y: e.clientY };
    ctxMenuNote = note ?? null;
  }

  function focusSearch() { searchInputEl?.focus(); }

  async function loadNotes() {
    loading = true;
    try {
      const res = await api("/api/notes");
      notes = await res.json();
    } catch { notes = []; }
    loading = false;
  }

  async function doSearch(query: string) {
    if (!query.trim()) { searchResults = []; searching = false; return; }
    searching = true;
    try {
      const res = await api(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) searchResults = await res.json();
      else searchResults = [];
    } catch { searchResults = []; }
    searching = false;
  }

  function handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => doSearch(val), 200);
  }

  function clearSearch() {
    searchQuery = ""; searchResults = []; searching = false;
    searchInputEl?.blur();
  }

  function openMediaPicker() { showMediaPicker = true; }

  function handleMediaSelect(item: { id: string; original_name: string; mime_type: string }) {
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/api/media/${item.id}/file`;
    const md = item.mime_type.startsWith("image/")
      ? `![${item.original_name}](${url})`
      : `[${item.original_name}](${url})`;
    mediaToInsertMd = md;
    mediaInsertKey++;
    showMediaPicker = false;
    const pane = getFocusedPane();
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (tab?.noteId) {
      api(`/api/media/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ note_id: tab.noteId }),
      });
    }
  }

  async function loadPaneNoteMedia(paneId: string, noteId: string) {
    try {
      const res = await api(`/api/media?note_id=${noteId}`);
      const pane = panes[paneId];
      if (!pane) return;
      if (res.ok) pane.noteMedia = await res.json();
      else pane.noteMedia = [];
    } catch {
      const pane = panes[paneId];
      if (pane) pane.noteMedia = [];
    }
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
    if (!val || val === notes.find(n => n.slug === slug)?.title) return;
    await api(`/api/notes/${slug}`, { method: "PUT", body: JSON.stringify({ title: val }) });
    for (const pid of Object.keys(panes)) {
      const p = panes[pid];
      const tab = p.tabs.find(t => t.slug === slug);
      if (tab) { tab.title = val; tab.savedTitle = val; }
    }
    await loadNotes();
  }

  function cancelRename() { renamingSlug = null; renameValue = ""; }

  async function deleteNote(note: NoteSummary) {
    closeCtxMenu();
    if (!confirm(`Delete "${note.title}"?`)) return;
    await api(`/api/notes/${note.slug}`, { method: "DELETE" });
    for (const pid of Object.keys(panes)) {
      const p = panes[pid];
      const tab = p.tabs.find(t => t.slug === note.slug);
      if (tab) handlePaneCloseTab(pid, tab.id);
    }
    await loadNotes();
  }

  async function handleLogout() {
    await auth.logout();
    goto("/login");
  }

  function formatDate(iso: string) { return iso.slice(0, 10); }
  function focusInput(node: HTMLInputElement) { node.focus(); node.select(); }

  // Active slug for sidebar highlighting (focused pane's active tab slug)
  let activeHighlightSlug = $derived((() => {
    const pane = getFocusedPane();
    const tab = pane.tabs.find(t => t.id === pane.activeTabId);
    return tab?.slug ?? "";
  })());
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
            class:active={activeHighlightSlug === note.slug}
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
        <button onclick={() => settingsOpen = true} class="cursor-pointer hover:opacity-80 p-1" style="color: var(--text-secondary);" title="Settings">
          <Settings size={16} />
        </button>
        <button onclick={handleLogout} class="cursor-pointer hover:opacity-80 p-1" style="color: var(--text-danger);" title="Log out">
          <LogOut size={16} />
        </button>
      </div>
    {/if}
  </aside>

  <!-- Main area -->
  <main class="flex-1 flex flex-col min-h-0" style="background: var(--bg-page);">
    {#if sidebarTab === "media"}
      <MediaGallery />
    {:else}
      <SplitLayout
        node={layout}
        {panes}
        {focusedPaneId}
        onResize={(splitId, ratio) => { layout = updateRatio(layout, splitId, ratio); }}
        insertMediaMd={mediaToInsertMd}
        insertMediaKey={mediaInsertKey}
        onSwitchTab={handlePaneSwitchTab}
        onCloseTab={handlePaneCloseTab}
        onTabContextMenu={handleTabContextMenu}
        onReorderTabs={handlePaneReorderTabs}
        onMoveTab={handleMoveTab}
        onTabTitleChange={handlePaneTitleChange}
        onTabTagsChange={handlePaneTagsChange}
        onTabContentChange={handlePaneContentChange}
        onOpenMediaPicker={openMediaPicker}
        onRemoveMedia={handlePaneRemoveMedia}
        onUploadComplete={handlePaneUploadComplete}
        onSelectNote={selectNote}
      />
    {/if}
  </main>
</div>

{#if ctxMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="none"
    class="fixed inset-0 z-40"
    onclick={closeCtxMenu}
    oncontextmenu={(e) => e.preventDefault()}
  ></div>

  <div
    class="fixed z-50 rounded border shadow-lg py-1 min-w-[140px]"
    style="left: {ctxMenu.x}px; top: {ctxMenu.y}px; background: var(--bg-sidebar); border-color: var(--border-color);"
  >
    <button onclick={newTab} class="ctx-menu-item">New note</button>
    {#if ctxMenuNote}
      <button onclick={() => startRename(ctxMenuNote!)} class="ctx-menu-item">Rename</button>
      <div class="border-t" style="border-color: var(--border-color);"></div>
      <button onclick={() => deleteNote(ctxMenuNote!)} class="ctx-menu-item" style="color: var(--text-danger);">Delete</button>
    {/if}
  </div>
{/if}

{#if tabCtxMenu}
  {@const menu = tabCtxMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="none"
    class="fixed inset-0 z-40"
    onclick={closeTabCtxMenu}
    oncontextmenu={(e) => e.preventDefault()}
  ></div>

  <div
    class="fixed z-50 rounded border shadow-lg py-1 min-w-[200px]"
    style="left: {menu.x}px; top: {menu.y}px; background: var(--bg-sidebar); border-color: var(--border-color);"
  >
    <button onclick={() => closeAllTabsInPane(menu.paneId)} class="ctx-menu-item">Close all</button>
    <button onclick={() => closeOtherTabsInPane(menu.paneId, menu.tabId)} class="ctx-menu-item">Close others</button>
    <div class="border-t" style="border-color: var(--border-color);"></div>
    <button onclick={() => { splitFocusedPane("vertical"); closeTabCtxMenu(); }} class="ctx-menu-item">Split right</button>
    <button onclick={() => { splitFocusedPane("horizontal"); closeTabCtxMenu(); }} class="ctx-menu-item">Split down</button>
  </div>
{/if}

{#if showMediaPicker}
  <MediaPicker onClose={() => showMediaPicker = false} onSelect={handleMediaSelect} />
{/if}

<CommandPalette
  open={cmdPaletteOpen}
  onClose={() => cmdPaletteOpen = false}
  onCreateNote={newTab}
  onSave={save}
  onFocusSearch={focusSearch}
  onSwitchTab={(tab) => sidebarTab = tab}
  onSetTheme={(t) => { theme.setTheme(t); }}
  onLogout={handleLogout}
  onOpenSettings={() => settingsOpen = true}
  onSplitRight={() => splitFocusedPane("vertical")}
  onSplitDown={() => splitFocusedPane("horizontal")}
  onClosePane={closeFocusedPane}
  onCloseTab={closeFocusedTab}
/>

<SettingsModal
  open={settingsOpen}
  onClose={() => settingsOpen = false}
  onImported={async () => { await loadNotes(); }}
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
