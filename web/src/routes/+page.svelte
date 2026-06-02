<script lang="ts">
  import * as auth from "$lib/auth.svelte";
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let health = $state("loading...");

  onMount(async () => {
    try {
      const res = await api("/api/health");
      const data = await res.json();
      health = data.status;
    } catch {
      health = "backend unreachable";
    }
  });

  async function handleLogout() {
    await auth.logout();
    goto("/login");
  }
</script>

<h1 class="text-2xl font-bold">openslate</h1>
<p>Backend: {health}</p>
<p>Authenticated: {auth.isAuthenticated()}</p>

<button
  onclick={handleLogout}
  class="mt-2 rounded bg-red-600 px-4 py-2 text-white"
>
  Log out
</button>
