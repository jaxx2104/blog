import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import ogs from "open-graph-scraper"

export interface OgpData {
  title: string
  description: string
  image: string
  url: string
  siteName: string
}

/**
 * Successful OGP lookups are persisted to a JSON file that is committed to the
 * repository, so a build produces the same HTML no matter what the network is
 * doing. Without it every build re-fetches every linked page, and a page that
 * happens to be down degrades silently to fallback data — the same source then
 * renders different link cards on every build.
 *
 * Failures are deliberately NOT persisted (see `fetchAndCache`).
 */
const CACHE_FILE = join(findRepoRoot(), "data", "ogp-cache.json")

/** Delay before writing, so a burst of parallel fetches produces one write. */
const FLUSH_DELAY_MS = 200

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?.*)?$/i

/** Entries loaded from and written back to CACHE_FILE. Successes only. */
const persistedCache = new Map<string, OgpData>()

/**
 * Fallback data for URLs that could not be fetched in this run, plus image
 * URLs (which never carry OGP metadata). Kept out of CACHE_FILE so a transient
 * outage is retried on the next build instead of being frozen into the repo.
 */
const memoryCache = new Map<string, OgpData>()

/** In-flight fetches, so parallel cards for one URL hit the network once. */
const inFlight = new Map<string, Promise<OgpData>>()

let cacheLoaded = false
let cacheDirty = false
let exitHookRegistered = false
let flushTimer: NodeJS.Timeout | null = null

/**
 * `off`: fetch anything missing from the cache (default).
 * `fallback`: never touch the network; render fallback cards for cache misses.
 * `strict`: never touch the network; fail the build on a cache miss.
 */
type OfflineMode = "off" | "fallback" | "strict"

const OFFLINE_MODE: OfflineMode = readOfflineMode()

function readOfflineMode(): OfflineMode {
  const raw = process.env.OGP_OFFLINE?.trim().toLowerCase()
  if (!raw || raw === "0" || raw === "false" || raw === "off") return "off"
  if (raw === "strict") return "strict"
  return "fallback"
}

export async function fetchOgp(url: string): Promise<OgpData | null> {
  loadCache()

  const cached = persistedCache.get(url) ?? memoryCache.get(url)
  if (cached) return cached

  // Direct image URLs never return OGP metadata -- skip the fetch.
  if (IMAGE_EXT_RE.test(url)) {
    return rememberFallback(url)
  }

  if (OFFLINE_MODE !== "off") {
    if (OFFLINE_MODE === "strict") {
      throw new Error(
        `[link-card] no cached OGP data for ${url} and OGP_OFFLINE=strict. ` +
          `Run a build with network access to refresh ${CACHE_FILE}.`,
      )
    }
    console.warn(
      `[link-card] offline: no cached OGP data for ${url}, rendering a fallback card`,
    )
    return rememberFallback(url)
  }

  const pending = inFlight.get(url)
  if (pending) return pending

  const request = fetchAndCache(url)
  inFlight.set(url, request)
  try {
    return await request
  } finally {
    inFlight.delete(url)
  }
}

async function fetchAndCache(url: string): Promise<OgpData> {
  try {
    const { result } = await ogs({
      url,
      timeout: 10000,
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      },
    })

    if (result.success) {
      const ogpData: OgpData = {
        title: result.ogTitle || result.dcTitle || extractTitleFromUrl(url),
        description: result.ogDescription || result.dcDescription || "",
        image: result.ogImage?.[0]?.url || "",
        url: result.ogUrl || url,
        siteName: result.ogSiteName || extractDomain(url),
      }
      persistedCache.set(url, ogpData)
      cacheDirty = true
      scheduleFlush()
      return ogpData
    }
  } catch (_error) {
    // OGP fetch failed — fallback uses domain/path info from URL
  }

  // Failures stay in memory only. Writing them to CACHE_FILE would make one
  // bad build permanent; keeping them out means the next build retries.
  return rememberFallback(url)
}

function rememberFallback(url: string): OgpData {
  const fallback = fallbackOgpData(url)
  memoryCache.set(url, fallback)
  return fallback
}

function loadCache(): void {
  if (cacheLoaded) return
  cacheLoaded = true
  if (!existsSync(CACHE_FILE)) return

  try {
    const parsed: unknown = JSON.parse(readFileSync(CACHE_FILE, "utf8"))
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("expected a JSON object at the top level")
    }
    for (const [url, value] of Object.entries(parsed)) {
      const entry = toOgpData(value)
      if (entry) persistedCache.set(url, entry)
    }
  } catch (error) {
    // A broken cache must not break the build; treat it as empty and refetch.
    console.warn(
      `[link-card] ignoring unreadable OGP cache ${CACHE_FILE}: ${
        (error as Error).message
      }`,
    )
  }
}

function toOgpData(value: unknown): OgpData | null {
  if (value === null || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const fields = ["title", "description", "image", "url", "siteName"] as const
  if (fields.some((field) => typeof record[field] !== "string")) return null
  return {
    title: record.title as string,
    description: record.description as string,
    image: record.image as string,
    url: record.url as string,
    siteName: record.siteName as string,
  }
}

/**
 * Sorted keys and a fixed field order keep the file diffable: adding one link
 * changes one block, not the whole file.
 */
function serializeCache(): string {
  const entries = [...persistedCache.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
  const sorted: Record<string, OgpData> = {}
  for (const [url, ogp] of entries) {
    sorted[url] = {
      title: ogp.title,
      description: ogp.description,
      image: ogp.image,
      url: ogp.url,
      siteName: ogp.siteName,
    }
  }
  return `${JSON.stringify(sorted, null, 2)}\n`
}

/**
 * Writes the whole cache at once. Called from a debounce timer and from the
 * exit hook, never per fetch, so concurrent `fetchOgp` calls cannot interleave
 * writes.
 */
export function flushOgpCache(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!cacheDirty) return
  cacheDirty = false

  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true })
    writeFileSync(CACHE_FILE, serializeCache(), "utf8")
  } catch (error) {
    console.warn(
      `[link-card] failed to write OGP cache ${CACHE_FILE}: ${
        (error as Error).message
      }`,
    )
  }
}

function scheduleFlush(): void {
  registerExitFlush()
  if (flushTimer) return
  // unref'd: the timer must not keep a finished build alive. If the process
  // exits first, the exit hook writes instead.
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushOgpCache()
  }, FLUSH_DELAY_MS)
  flushTimer.unref()
}

function registerExitFlush(): void {
  if (exitHookRegistered) return
  exitHookRegistered = true
  process.once("exit", () => flushOgpCache())
}

/**
 * velite bundles this module into `node_modules/.velite.config.compiled.mjs`,
 * so `import.meta.url` does not point at `lib/`. Walk up from cwd instead.
 */
function findRepoRoot(): string {
  let dir = process.cwd()
  for (let depth = 0; depth < 8; depth++) {
    if (existsSync(join(dir, "package.json"))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

function fallbackOgpData(url: string): OgpData {
  return {
    title: extractTitleFromUrl(url),
    description: "",
    image: "",
    url,
    siteName: extractDomain(url),
  }
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split("/").filter(Boolean).pop()
    return lastSegment || extractDomain(url)
  } catch {
    return url
  }
}

export function generateLinkCardHtml(ogp: OgpData): string {
  const imageHtml = ogp.image
    ? `<div class="link-card-image"><img src="${escapeHtml(
        ogp.image,
      )}" alt="" loading="lazy" /></div>`
    : `<div class="link-card-image link-card-no-image"><span>${escapeHtml(
        ogp.siteName.charAt(0).toUpperCase(),
      )}</span></div>`

  return `<a href="${escapeHtml(
    ogp.url,
  )}" class="link-card" target="_blank" rel="noopener noreferrer">
  ${imageHtml}
  <div class="link-card-content">
    <div class="link-card-title">${escapeHtml(ogp.title)}</div>
    <div class="link-card-description">${escapeHtml(ogp.description)}</div>
    <div class="link-card-site">${escapeHtml(ogp.siteName)}</div>
  </div>
</a>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
