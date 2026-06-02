<script lang="ts">
  import * as auth from "$lib/auth.svelte";
  import { goto } from "$app/navigation";

  let password = $state("");
  let error = $state("");

  $effect(() => {
    if (auth.isAuthenticated()) {
      goto("/");
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";
    const ok = await auth.login(password);
    if (ok) {
      goto("/");
    } else {
      error = "Wrong password";
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center" style="background: var(--bg-page);">
  <form onsubmit={handleSubmit} class="w-full max-w-sm space-y-4">
    <h1 class="text-2xl font-bold" style="color: var(--text-primary);">openslate</h1>
    <input
      type="password"
      bind:value={password}
      placeholder="Password"
      class="w-full rounded border px-3 py-2"
      style="color: var(--text-primary); caret-color: var(--text-primary); background: var(--bg-editor); border-color: var(--border-input);"
    />
    {#if error}
      <p class="text-sm" style="color: var(--text-danger);">{error}</p>
    {/if}
    <button
      type="submit"
      class="w-full rounded px-4 py-2"
      style="color: var(--text-btn-primary); background: var(--bg-btn-primary);"
    >
      Log in
    </button>
  </form>
</div>
