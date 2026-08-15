import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Separate from vite.config.mts on purpose: that config loads the TanStack
// Start plugin and prerender setup, which unit tests have no use for. The
// react plugin and the "@" alias are here because component specs need them —
// everything else in the build pipeline stays out.
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
  test: {
    include: ["{lib,components,app,styles}/**/*.test.{ts,tsx}"],
    // Node by default; component specs opt into a DOM with a
    // `@vitest-environment jsdom` docblock. Running every pure-function spec
    // in jsdom would cost startup time for nothing.
    environment: "node",
  },
})
