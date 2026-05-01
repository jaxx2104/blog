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
      resolve: {
        // styled-components has a CJS default export that does not
        // round-trip cleanly through Vite/rolldown's ESM externalization
        // in the SSR bundle (yields `styled.article is not a function`).
        // Bundling it into the SSR output sidesteps the interop hole.
        noExternal: ["styled-components"],
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
