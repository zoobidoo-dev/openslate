import tailwindcss from "@tailwindcss/vite";

import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // svelteTesting() only activates under Vitest (it no-ops otherwise), so it is
  // safe to include alongside the dev/build plugins. It resolves Svelte's
  // browser build in tests and registers DOM auto-cleanup between cases.
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
