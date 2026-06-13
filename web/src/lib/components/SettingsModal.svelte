<script lang="ts">
  import { X } from "@lucide/svelte";
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
            <label class="text-xs block mb-1.5" for="font-size-slider" style="color: var(--text-secondary);">
              Font size: {currentPrefs.editorFontSize}px
            </label>
            <input
              id="font-size-slider"
              type="range"
              min="10"
              max="28"
              value={currentPrefs.editorFontSize}
              oninput={(e) => prefs.setPreference("editorFontSize", Number((e.target as HTMLInputElement).value))}
              class="w-full"
            />
          </div>

          <!-- Line height -->
          <div class="mb-3">
            <label class="text-xs block mb-1.5" for="line-height-slider" style="color: var(--text-secondary);">
              Line height: {currentPrefs.editorLineHeight.toFixed(1)}
            </label>
            <input
              id="line-height-slider"
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={currentPrefs.editorLineHeight}
              oninput={(e) => prefs.setPreference("editorLineHeight", Number((e.target as HTMLInputElement).value))}
              class="w-full"
            />
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
              class="relative w-9 h-5 rounded-full cursor-pointer transition-colors border"
              style={currentPrefs.editorLineNumbers
                ? "background: var(--bg-btn-primary); border-color: var(--bg-btn-primary);"
                : "background: var(--bg-tag); border-color: var(--border-color);"}
              role="switch"
              aria-checked={currentPrefs.editorLineNumbers}
              aria-label="Toggle line numbers"
            >
              <span
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={currentPrefs.editorLineNumbers ? "left: 18px;" : "left: 2px;"}
              ></span>
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
          <div class="flex flex-wrap gap-2">
            {#each theme.themes as t}
              <button
                onclick={() => { theme.setTheme(t.id); }}
                class="flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer text-xs transition-colors"
                class:active={currentTheme === t.id}
                style={currentTheme === t.id
                  ? "background: var(--bg-btn-primary); color: var(--text-btn-primary); border-color: var(--bg-btn-primary);"
                  : "background: transparent; color: var(--text-secondary); border-color: var(--border-color);"}
              >
                <span
                  class="w-3 h-3 rounded-full border"
                  style="background: {t.id === 'light' ? '#ffffff' : t.id === 'dark' ? '#25262b' : t.id === 'sepia' ? '#f4ecd8' : t.id === 'nord' ? '#3b4252' : t.id === 'monokai' ? '#272822' : '#1a1b26'}; border-color: var(--border-color);"
                ></span>
                {t.name}
              </button>
            {/each}
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}
