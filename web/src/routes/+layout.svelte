<script lang="ts">
  import "../app.css";
  import * as auth from "$lib/auth.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";

  let { children } = $props();
  let currentPath = $derived(String(page.url.pathname));

  $effect(() => {
    auth.checkAuth();
  });

  $effect(() => {
    if (
      !auth.isLoading() &&
      !auth.isAuthenticated() &&
      currentPath !== "/login"
    ) {
      goto("/login");
    }
  });
</script>

{#if currentPath === "/login"}
  {@render children()}
{:else if auth.isLoading()}
  <div class="flex min-h-screen items-center justify-center">
    <p>Loading...</p>
  </div>
{:else if auth.isAuthenticated()}
  {@render children()}
{:else}
  <div class="flex min-h-screen items-center justify-center">
    <p>Redirecting...</p>
  </div>
{/if}
