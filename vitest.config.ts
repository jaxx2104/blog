import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    reporters: "default",
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, ""),
    },
  },
})
