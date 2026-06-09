<script lang="ts">
  import * as theme from "$lib/theme.svelte";

  let { open, onClose, onCreateNote, onSave, onFocusSearch, onSwitchTab, onSetTheme, onLogout }: {
    open: boolean;
    onClose: () => void;
    onCreateNote: () => void;
    onSave: () => void;
    onFocusSearch: () => void;
    onSwitchTab: (tab: "notes" | "media") => void;
    onSetTheme: (t: theme.Theme) => void;
    onLogout: () => void;
  } = $props();

  let searchQuery = $state("");
  let activeIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);

  type Command = {
    id: string;
    label: string;
    shortcut?: string;
    action: () => void;
  };

  let allCommands = $derived<Command[]>([
    { id: "search", label: "Search notes", shortcut: "⌘⇧F / Ctrl+Shift+F", action: () => { onFocusSearch(); onClose(); } },
    { id: "new", label: "New note", shortcut: "⌘⇧K / Ctrl+Shift+K", action: () => { onCreateNote(); onClose(); } },
    { id: "save", label: "Save current note", shortcut: "⌘⇧S / Ctrl+Shift+S", action: () => { onSave(); onClose(); } },
    { id: "media", label: "Media gallery", shortcut: "⌘⇧G / Ctrl+Shift+G", action: () => { onSwitchTab("media"); onClose(); } },
    { id: "notes", label: "Notes list", action: () => { onSwitchTab("notes"); onClose(); } },
    ...theme.themes.map((t) => ({
      id: `theme-${t.id}`,
      label: `Theme: ${t.name}`,
      action: () => { onSetTheme(t.id); onClose(); },
    })),
    { id: "logout", label: "Log out", action: () => { onLogout(); onClose(); } },
  ]);

  let filtered = $derived(
    searchQuery.trim()
      ? allCommands.filter((c) =>
          c.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allCommands,
  );

  $effect(() => {
    if (open) {
      searchQuery = "";
      activeIndex = 0;
      setTimeout(() => {
        inputEl?.focus();
      });
    }
  });

  $effect(() => {
    activeIndex;
    filtered;
    if (open && listEl) {
      const el = listEl.querySelector('[data-active="true"]') as HTMLElement | null;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  });

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = (activeIndex + 1) % filtered.length;
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) cmd.action();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex justify-center"
    style="padding-top: 15vh; background: rgba(0,0,0,0.3);"
    role="none"
    onclick={onClose}
  >
    <div
      class="rounded-lg border shadow-2xl w-[520px] max-h-[60vh] flex flex-col"
      style="background: var(--bg-sidebar); border-color: var(--border-color);"
      role="dialog"
      aria-label="Command palette"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="p-3 border-b" style="border-color: var(--border-color);">
        <input
          bind:this={inputEl}
          bind:value={searchQuery}
          onkeydown={handleInputKeydown}
          placeholder="Type a command..."
          class="w-full text-sm px-2 py-1.5 rounded outline-none"
          style="color: var(--text-primary); background: var(--bg-editor); border: 1px solid var(--border-input);"
        />
      </div>
      <div bind:this={listEl} class="flex-1 overflow-y-auto p-2">
        {#if filtered.length === 0}
          <p class="text-sm p-2" style="color: var(--text-tertiary);">No matching commands</p>
        {:else}
          {#each filtered as cmd, i}
            <button
              onclick={() => cmd.action()}
              class="w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between"
              class:bg-note-active={i === activeIndex}
              data-active={i === activeIndex}
              onmouseenter={() => activeIndex = i}
            >
              <span style="color: var(--text-primary);">{cmd.label}</span>
              {#if cmd.shortcut}
                <span class="text-xs ml-4 opacity-60" style="color: var(--text-tertiary);">
                  {cmd.shortcut}
                </span>
{/if}

<style>
  button:hover:not(.bg-note-active) {
    background: var(--bg-note-hover);
  }
</style>
            </button>
          {/each}
        {/if}
      </div>
      <div class="px-3 py-1.5 border-t text-xs flex gap-3" style="border-color: var(--border-color); color: var(--text-tertiary);">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc dismiss</span>
      </div>
    </div>
  </div>
{/if}
