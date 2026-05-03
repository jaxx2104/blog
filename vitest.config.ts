import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    reporters: "default",
    pool: "forks",
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname.replace(/\/$/, "") },
  },
})
