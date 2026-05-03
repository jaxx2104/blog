import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const __dirname = dirname(fileURLToPath(import.meta.url))

type VelitePost = {
  permalink: string
  title: string
  excerpt: string
  created_at: string
  updated_at: string
}

function loadPosts(): VelitePost[] {
  const veliteFile = resolve(__dirname, ".velite/posts.json")
  try {
    const raw = readFileSync(veliteFile, "utf8")
    return JSON.parse(raw) as VelitePost[]
  } catch (err) {
    console.warn(
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to home-only.`,
    )
    return []
  }
}

const SITE_URL = "https://jaxx2104.info"
const SITE_TITLE = "jaxx2104.info"
const SITE_DESCRIPTION = "プログラムとバグが好き"
const RSS_ITEM_LIMIT = 30

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function normalizePermalink(p: string): string {
  return p.endsWith("/") ? p : `${p}/`
}

function buildSitemap(posts: VelitePost[]): string {
  const buildDate = new Date().toISOString()
  const urls: string[] = []
  urls.push(
    `  <url><loc>${SITE_URL}/</loc><lastmod>${buildDate}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  )
  urls.push(
    `  <url><loc>${SITE_URL}/profile/</loc><lastmod>${buildDate}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
  )
  for (const post of posts) {
    const loc = `${SITE_URL}${normalizePermalink(post.permalink)}`
    const lastmod = new Date(post.updated_at).toISOString()
    urls.push(
      `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    )
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`
}

function buildFeed(posts: VelitePost[]): string {
  const sorted = [...posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const latest = sorted.slice(0, RSS_ITEM_LIMIT)
  const lastBuildDate = new Date().toUTCString()
  const items = latest
    .map((post) => {
      const link = `${SITE_URL}${normalizePermalink(post.permalink)}`
      const pubDate = new Date(post.created_at).toUTCString()
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`
    })
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ja</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`
}

function seoArtifactsPlugin(posts: VelitePost[]): import("vite").Plugin {
  return {
    name: "blog-seo-artifacts",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir
      if (!dir || !dir.endsWith("client")) return
      writeFileSync(resolve(dir, "sitemap.xml"), buildSitemap(posts))
      writeFileSync(resolve(dir, "feed.xml"), buildFeed(posts))
    },
  }
}

const posts = loadPosts()
const permalinks = posts.map((p) => p.permalink)
const allPages = ["/", "/profile/", ...permalinks]

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
    seoArtifactsPlugin(posts),
  ],
})
