import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "../site"

/**
 * sitemap.xml and feed.xml, built from the velite output at bundle time.
 *
 * Extracted from vite.config.mts so the XML escaping and the date handling
 * can be tested — a malformed feed is the kind of thing that only surfaces
 * when a reader silently stops updating.
 */

/** The subset of a velite post these artifacts need. */
export type SeoPost = {
  permalink: string
  title: string
  excerpt: string
  created_at: string
  updated_at?: string
}

/** Extra non-post URLs to list, e.g. pages 2..N of the index. */
export type SeoPage = {
  path: string
  lastmod?: string
  changefreq: string
  priority: string
}

const RSS_ITEM_LIMIT = 30

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Permalinks are normalised to `/<slug>/` by lib/content/schema.ts. */
export function lastModified(post: SeoPost): string {
  return post.updated_at ?? post.created_at
}

/**
 * Newest post date, as an ISO string. Velite emits isodate() through
 * `new Date(v).toISOString()`, so lexicographic comparison is safe.
 * Empty for an empty corpus — callers omit the field in that case.
 */
export function latestPostDate(posts: SeoPost[]): string {
  return posts.reduce((max, p) => {
    const t = lastModified(p)
    return t > max ? t : max
  }, "")
}

function urlEntry(
  loc: string,
  lastmod: string | undefined,
  changefreq: string,
  priority: string,
): string {
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
  return `  <url><loc>${escapeXml(loc)}</loc>${mod}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}

export function buildSitemap(posts: SeoPost[], pages: SeoPage[] = []): string {
  // lastmod comes from the content, not the clock: build time made every URL
  // look freshly modified on each deploy.
  const newest = latestPostDate(posts) || undefined
  const urls = [
    urlEntry(`${SITE_URL}/`, newest, "daily", "1.0"),
    // No lastmod for /profile/ — nothing in the build knows when its content
    // last changed, and a fabricated date is worse than none.
    urlEntry(`${SITE_URL}/profile/`, undefined, "monthly", "0.5"),
    ...pages.map((p) =>
      urlEntry(`${SITE_URL}${p.path}`, p.lastmod, p.changefreq, p.priority),
    ),
    ...posts.map((post) =>
      urlEntry(
        `${SITE_URL}${post.permalink}`,
        lastModified(post),
        "monthly",
        "0.7",
      ),
    ),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`
}

export function buildFeed(posts: SeoPost[]): string {
  const sorted = [...posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const newest = latestPostDate(posts)
  // Content-derived, so a rebuild without new posts does not tell readers the
  // feed changed.
  const lastBuildDate = newest
    ? `    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>\n`
    : ""
  const items = sorted
    .slice(0, RSS_ITEM_LIMIT)
    .map((post) => {
      const link = `${SITE_URL}${post.permalink}`
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
${lastBuildDate}${items}
  </channel>
</rss>
`
}
