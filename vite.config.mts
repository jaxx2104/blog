import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const __dirname = dirname(fileURLToPath(import.meta.url))

type VeliteShape = {
  permalink: string
}

function loadPermalinks(): string[] {
  const veliteFile = resolve(__dirname, ".velite/posts.json")
  try {
    const raw = readFileSync(veliteFile, "utf8")
    const posts = JSON.parse(raw) as VeliteShape[]
    return posts.map((p) => p.permalink)
  } catch (err) {
    console.warn(
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to home-only.`,
    )
    return []
  }
}

const permalinks = loadPermalinks()
const allPages = ["/", "/profile/", ...permalinks]

export default defineConfig({
  server: {
    port: 3000,
  },
  // Bundle all CSS modules into a single asset. With code-split CSS,
  // SPA navigation between routes drops the previous route's stylesheet
  // (incl. shared layout/* chunks), leaving the navi/footer unstyled
  // until a hard reload. A single bundle avoids the per-route teardown.
  build: {
    cssCodeSplit: false,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "assets/[name]-[hash].js",
          },
        },
      },
    },
  },
  plugins: [
    tanstackStart({
      srcDirectory: "app",
      // Explicit pages list. crawlLinks is OFF because some posts contain
      // OGP link cards whose embedded protocol-relative URLs (//host/...)
      // confuse the prerender crawler into following external sites.
      pages: allPages.map((path) => ({ path })),
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoSubfolderIndex: true,
        failOnError: true,
      },
    }),
    viteReact(),
  ],
})
