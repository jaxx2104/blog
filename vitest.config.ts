import { defineConfig } from "vitest/config"

// Separate from vite.config.mts on purpose: that config loads the TanStack
// Start plugin and prerender setup, which unit tests have no use for.
export default defineConfig({
  test: {
    include: ["{lib,components,app}/**/*.test.{ts,tsx}"],
    environment: "node",
  },
})
