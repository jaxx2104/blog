import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { pageCount, pagePath } from "./components/features/article/pagination"
import {
  buildFeed,
  buildSitemap,
  latestPostDate,
  type SeoPage,
  type SeoPost,
} from "./lib/seo/artifacts"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadPosts(): SeoPost[] {
  const veliteFile = resolve(__dirname, ".velite/posts.json")
  try {
    const raw = readFileSync(veliteFile, "utf8")
    return JSON.parse(raw) as SeoPost[]
  } catch (err) {
    console.warn(
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to home-only.`,
    )
    return []
  }
}

function seoArtifactsPlugin(
  posts: SeoPost[],
  pages: SeoPage[],
): import("vite").Plugin {
  return {
    name: "blog-seo-artifacts",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir
      if (!dir || !dir.endsWith("client")) return
      writeFileSync(resolve(dir, "sitemap.xml"), buildSitemap(posts, pages))
      writeFileSync(resolve(dir, "feed.xml"), buildFeed(posts))
    },
  }
}

const posts = loadPosts()
const permalinks = posts.map((p) => p.permalink)
// Pages 2..N of the paginated index ("/" is page 1). The page arithmetic is
// imported rather than duplicated so the build and the router cannot disagree
// about how many pages exist — with crawlLinks off, a page missing from this
// list is simply never written.
const indexPagePaths = Array.from(
  { length: pageCount(posts.length) - 1 },
  (_, i) => pagePath(i + 2),
)
const allPages = ["/", "/profile/", "/404", ...indexPagePaths, ...permalinks]

// Every index page reshuffles when a post is added, so they share the newest
// post date rather than the date of the posts they currently hold.
const newestPostDate = latestPostDate(posts) || undefined
const indexPageEntries: SeoPage[] = indexPagePaths.map((path) => ({
  path,
  lastmod: newestPostDate,
  changefreq: "weekly",
  priority: "0.5",
}))

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  // Bundle all CSS modules into a single asset. With code-split CSS,
  // SPA navigation between routes drops the previous route's stylesheet
  // (incl. shared layout/* chunks), leaving the navi/footer unstyled
  // until a hard reload. A single bundle avoids the per-route teardown.
  build: {
    cssCodeSplit: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Article bodies must each keep their own chunk — folding them
          // into "posts" would put all of them back into every page.
          if (id.includes("/.velite/bodies/")) return
          if (id.includes(".velite")) return "posts"
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("@tanstack") ||
              id.includes("seroval")
            ) {
              return "vendor"
            }
          }
        },
      },
    },
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
    seoArtifactsPlugin(posts, indexPageEntries),
  ],
})
