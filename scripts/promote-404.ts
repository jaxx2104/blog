/**
 * Copies the prerendered /404/ page to dist/client/404.html.
 *
 * Cloudflare Pages looks for 404.html when a request matches no file. Without
 * one it falls back to single-page-application behaviour and answers *any*
 * missing path with index.html and a 200 — including a missing /assets/*.css,
 * which then carries the immutable Cache-Control from public/_headers and
 * sticks in the edge cache for a year. That happened once, in the window
 * between a deploy reporting success and its assets propagating.
 *
 * This runs from the build script rather than a vite plugin: TanStack Start
 * prerenders after vite's `closeBundle`, so no plugin hook sees the file.
 */
import { copyFile, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = resolve(ROOT, "dist/client/404/index.html")
const TARGET = resolve(ROOT, "dist/client/404.html")

const source = await stat(SOURCE).catch(() => null)
if (source === null) {
  // Fail the build: shipping without 404.html silently restores the SPA
  // fallback that caused the incident above.
  console.error(
    `[promote-404] ${SOURCE} is missing. Is "/404" still listed in allPages in vite.config.mts?`,
  )
  process.exit(1)
}

await copyFile(SOURCE, TARGET)
console.log(`[promote-404] wrote dist/client/404.html (${source.size} bytes)`)
