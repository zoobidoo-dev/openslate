<script lang="ts">
  import { X, Code, ToggleLeft, ToggleRight } from "@lucide/svelte";
  import * as prefs from "$lib/preferences.svelte";
  import * as theme from "$lib/theme.svelte";

  let {
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  } = $props();

  let currentPrefs = $derived(prefs.getPreferences());
  let currentTheme = $derived(theme.getTheme());

  let fontGroups = $derived(
    prefs.FONTS.reduce<{ group: string; fonts: prefs.FontEntry[] }[]>((acc, f) => {
      const last = acc[acc.length - 1];
      if (last && last.group === f.group) {
        last.fonts.push(f);
      } else {
        acc.push({ group: f.group, fonts: [f] });
      }
      return acc;
    }, []),
  );

  let themeGroups = $derived(
    theme.themes.reduce<{ group: string; items: typeof theme.themes }[]>((acc, t) => {
      const last = acc[acc.length - 1];
      if (last && last.group === t.group) {
        last.items.push(t);
      } else {
        acc.push({ group: t.group, items: [t] });
      }
      return acc;
    }, []),
  );

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    role="none"
    class="fixed inset-0 z-50 flex items-center justify-center"
    onclick={onClose}
    onkeydown={handleKeydown}
  >
    <div class="absolute inset-0 bg-black/40"></div>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      role="none"
      class="relative z-10 w-full max-w-md mx-4 rounded-lg border shadow-xl max-h-[85vh] overflow-y-auto"
      style="background: var(--bg-page); border-color: var(--border-color);"
      onclick={(e) => e.stopPropagation()}
    >
      <div
        class="flex items-center justify-between px-5 py-3 border-b"
        style="border-color: var(--border-color);"
      >
        <h2 class="text-base font-semibold" style="color: var(--text-primary);">Settings</h2>
        <button
          onclick={onClose}
          class="cursor-pointer p-1 rounded hover:opacity-70"
          style="color: var(--text-secondary);"
        >
          <X size={18} />
        </button>
      </div>

      <div class="px-5 py-4 space-y-5">
        <!-- Editor -->
        <section>
          <h3 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">Editor</h3>

          <!-- Font family -->
          <div class="mb-3">
            <label class="text-xs block mb-1.5" for="font-select" style="color: var(--text-secondary);">Font</label>
            <select
              id="font-select"
              value={currentPrefs.editorFont}
              onchange={(e) => prefs.setPreference("editorFont", (e.target as HTMLSelectElement).value)}
              class="w-full text-xs px-2 py-1.5 rounded border outline-none cursor-pointer"
              style="color: var(--text-primary); background: var(--bg-editor); border-color: var(--border-input);"
            >
              {#each fontGroups as group}
                <optgroup label={group.group}>
                  {#each group.fonts as font}
                    <option value={font.id}>{font.label}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>
          </div>

          <!-- Font size -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs" for="font-size-slider" style="color: var(--text-secondary);">Font size</label>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded" style="color: var(--text-btn-primary); background: var(--bg-btn-primary);">{currentPrefs.editorFontSize}px</span>
            </div>
            <input
              id="font-size-slider"
              type="range"
              min="10"
              max="28"
              value={currentPrefs.editorFontSize}
              oninput={(e) => prefs.setPreference("editorFontSize", Number((e.target as HTMLInputElement).value))}
              class="styled-slider w-full"
              style="--fill: {(currentPrefs.editorFontSize - 10) / 18 * 100};"
            />
            <div class="flex justify-between mt-0.5">
              <span class="text-xs" style="color: var(--text-tertiary);">10</span>
              <span class="text-xs" style="color: var(--text-tertiary);">28</span>
            </div>
          </div>

          <!-- Line height -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs" for="line-height-slider" style="color: var(--text-secondary);">Line height</label>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded" style="color: var(--text-btn-primary); background: var(--bg-btn-primary);">{currentPrefs.editorLineHeight.toFixed(1)}</span>
            </div>
            <input
              id="line-height-slider"
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={currentPrefs.editorLineHeight}
              oninput={(e) => prefs.setPreference("editorLineHeight", Number((e.target as HTMLInputElement).value))}
              class="styled-slider w-full"
              style="--fill: {(currentPrefs.editorLineHeight - 1.0) / 1.5 * 100};"
            />
            <div class="flex justify-between mt-0.5">
              <span class="text-xs" style="color: var(--text-tertiary);">1.0</span>
              <span class="text-xs" style="color: var(--text-tertiary);">2.5</span>
            </div>
          </div>

          <!-- Code font -->
          <div class="mb-3 pt-2 border-t" style="border-color: var(--border-color);">
            <div class="flex items-center gap-2 mb-2">
              <Code size={14} style="color: var(--text-secondary);" />
              <span class="text-xs" style="color: var(--text-tertiary);">Code blocks</span>
            </div>
            <select
              id="code-font-select"
              value={currentPrefs.editorCodeFont}
              onchange={(e) => prefs.setPreference("editorCodeFont", (e.target as HTMLSelectElement).value)}
              class="w-full text-xs px-2 py-1.5 rounded border outline-none cursor-pointer mb-2"
              style="color: var(--text-primary); background: var(--bg-editor); border-color: var(--border-input);"
            >
              {#each fontGroups as group}
                {#if group.group === "Monospace"}
                  <optgroup label={group.group}>
                    {#each group.fonts as font}
                      <option value={font.id}>{font.label}</option>
                    {/each}
                  </optgroup>
                {/if}
              {/each}
            </select>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs" for="code-font-size-slider" style="color: var(--text-secondary);">Code size</label>
              <span class="text-xs font-medium px-1.5 py-0.5 rounded" style="color: var(--text-btn-primary); background: var(--bg-btn-primary);">{currentPrefs.editorCodeFontSize}px</span>
            </div>
            <input
              id="code-font-size-slider"
              type="range"
              min="10"
              max="24"
              value={currentPrefs.editorCodeFontSize}
              oninput={(e) => prefs.setPreference("editorCodeFontSize", Number((e.target as HTMLInputElement).value))}
              class="styled-slider w-full"
              style="--fill: {(currentPrefs.editorCodeFontSize - 10) / 14 * 100};"
            />
            <div class="flex justify-between mt-0.5">
              <span class="text-xs" style="color: var(--text-tertiary);">10</span>
              <span class="text-xs" style="color: var(--text-tertiary);">24</span>
            </div>
          </div>

          <!-- Editor width -->
          <div class="mb-3">
            <label class="text-xs block mb-1.5" style="color: var(--text-secondary);">Editor width</label>
            <div class="flex gap-1.5">
              {#each (["full", "constrained"] as const) as width}
                <button
                  onclick={() => prefs.setPreference("editorWidth", width)}
                  class="text-xs px-3 py-1.5 rounded border cursor-pointer transition-colors"
                  class:active={currentPrefs.editorWidth === width}
                  style={currentPrefs.editorWidth === width
                    ? "background: var(--bg-btn-primary); color: var(--text-btn-primary); border-color: var(--bg-btn-primary);"
                    : "background: transparent; color: var(--text-secondary); border-color: var(--border-color);"}
                >
                  {prefs.WIDTH_LABELS[width]}
                </button>
              {/each}
            </div>
          </div>

          <!-- Line numbers -->
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs" style="color: var(--text-secondary);">Line numbers</span>
            <button
              onclick={() => prefs.setPreference("editorLineNumbers", !currentPrefs.editorLineNumbers)}
              class="cursor-pointer"
              style="color: var(--text-secondary);"
              aria-label="Toggle line numbers"
            >
              {#if currentPrefs.editorLineNumbers}
                <ToggleRight size={24} style="color: var(--bg-btn-primary);" />
              {:else}
                <ToggleLeft size={24} />
              {/if}
            </button>
          </div>
        </section>

        <!-- Notes -->
        <section>
          <h3 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">Notes</h3>

          <!-- Sort order -->
          <div class="mb-3">
            <label class="text-xs block mb-1.5" style="color: var(--text-secondary);">Sort by</label>
            <div class="flex gap-1.5">
              {#each (["updated", "title", "created"] as const) as sort}
                <button
                  onclick={() => prefs.setPreference("noteSort", sort)}
                  class="text-xs px-3 py-1.5 rounded border cursor-pointer transition-colors"
                  class:active={currentPrefs.noteSort === sort}
                  style={currentPrefs.noteSort === sort
                    ? "background: var(--bg-btn-primary); color: var(--text-btn-primary); border-color: var(--bg-btn-primary);"
                    : "background: transparent; color: var(--text-secondary); border-color: var(--border-color);"}
                >
                  {prefs.SORT_LABELS[sort]}
                </button>
              {/each}
            </div>
          </div>
        </section>

        <!-- Theme -->
        <section>
          <h3 class="text-sm font-semibold mb-3" style="color: var(--text-primary);">Theme</h3>
          <select
            id="theme-select"
            value={currentTheme}
            onchange={(e) => theme.setTheme((e.target as HTMLSelectElement).value as theme.Theme)}
            class="w-full text-xs px-2 py-1.5 rounded border outline-none cursor-pointer"
            style="color: var(--text-primary); background: var(--bg-editor); border-color: var(--border-input);"
          >
            {#each themeGroups as group}
              <optgroup label={group.group}>
                {#each group.items as t}
                  <option value={t.id}>{t.name}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .styled-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: var(--bg-tag);
    outline: none;
    cursor: pointer;
  }

  .styled-slider::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(
      to right,
      var(--bg-btn-primary) 0%,
      var(--bg-btn-primary) var(--fill),
      var(--bg-tag) var(--fill),
      var(--bg-tag) 100%
    );
  }

  .styled-slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: var(--bg-tag);
    border: none;
  }

  .styled-slider::-moz-range-progress {
    height: 6px;
    border-radius: 3px;
    background: var(--bg-btn-primary);
  }

  .styled-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--bg-btn-primary);
    border: 2px solid var(--bg-page);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    margin-top: -5px;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .styled-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  .styled-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--bg-btn-primary);
    border: 2px solid var(--bg-page);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.1s;
  }

  .styled-slider::-moz-range-thumb:hover {
    transform: scale(1.15);
  }
</style>
