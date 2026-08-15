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

/**
 * URLs that are known not to yield OGP metadata, kept by hand.
 *
 * Failures are deliberately not written to CACHE_FILE, so without this list a
 * page that will never respond is retried on every single build — six of them
 * were, at up to a 10s timeout each, including from CI. This file is the place
 * to record "this one is not coming back" without pretending the fetch
 * succeeded. Delete an entry to start retrying it.
 */
const UNFETCHABLE_FILE = join(findRepoRoot(), "data", "ogp-unfetchable.json")

/** Delay before writing, so a burst of parallel fetches produces one write. */
const FLUSH_DELAY_MS = 200

/**
 * How long a cached lookup is trusted before an online build re-checks it.
 *
 * Without this the cache is write-once: a page that changes its title keeps
 * rendering the title it had the day it was first linked, forever. Ninety days
 * means a handful of requests a few times a year rather than on every build,
 * and only ever from a build that has the network anyway — `OGP_OFFLINE`
 * builds (CI is one) use whatever is in the file regardless of its age.
 */
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|ico|bmp)(\?.*)?$/i

/** A cache entry: the card data plus when it was last confirmed. */
type CacheEntry = OgpData & { fetchedAt?: string }

/** Entries loaded from and written back to CACHE_FILE. Successes only. */
const persistedCache = new Map<string, CacheEntry>()

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

/** Past its TTL, or written before entries carried a timestamp at all. */
export function isStale(entry: CacheEntry, now: number): boolean {
  if (!entry.fetchedAt) return true
  const fetchedAt = Date.parse(entry.fetchedAt)
  return Number.isNaN(fetchedAt) || now - fetchedAt > CACHE_TTL_MS
}

export async function fetchOgp(url: string): Promise<OgpData | null> {
  loadCache()

  const fallback = memoryCache.get(url)
  if (fallback) return fallback

  const cached = persistedCache.get(url)
  // An offline build takes the cache at face value: it has no way to refresh
  // an entry, and a stale title beats a fallback card.
  if (cached && (OFFLINE_MODE !== "off" || !isStale(cached, Date.now()))) {
    return cached
  }

  // Direct image URLs never return OGP metadata -- skip the fetch.
  if (IMAGE_EXT_RE.test(url)) {
    return rememberFallback(url)
  }

  // Recorded as permanently unfetchable: do not spend a timeout on it, in any
  // mode, and do not fail a strict build over it.
  if (loadUnfetchable().has(url)) {
    return rememberFallback(url)
  }

  if (OFFLINE_MODE !== "off") {
    if (OFFLINE_MODE === "strict") {
      throw new Error(
        `[link-card] no cached OGP data for ${url} and OGP_OFFLINE=strict. ` +
          `Run a build with network access to refresh ${CACHE_FILE}, or add ` +
          `the URL to ${UNFETCHABLE_FILE} if it will never resolve.`,
      )
    }
    console.warn(
      `[link-card] offline: no cached OGP data for ${url}, rendering a fallback card`,
    )
    return rememberFallback(url)
  }

  const pending = inFlight.get(url)
  if (pending) return pending

  const request = fetchAndCache(url, cached)
  inFlight.set(url, request)
  try {
    return await request
  } finally {
    inFlight.delete(url)
  }
}

/**
 * `previous` is the expired entry being re-checked, if there was one. A failed
 * refresh keeps it: the page was reachable once, and answering with a fallback
 * card would be a visible downgrade caused by a network blip.
 */
async function fetchAndCache(
  url: string,
  previous?: CacheEntry,
): Promise<OgpData> {
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
      const ogpData: CacheEntry = {
        title: result.ogTitle || result.dcTitle || extractTitleFromUrl(url),
        description: result.ogDescription || result.dcDescription || "",
        image: result.ogImage?.[0]?.url || "",
        url: result.ogUrl || url,
        siteName: result.ogSiteName || extractDomain(url),
        fetchedAt: new Date().toISOString(),
      }
      persistedCache.set(url, ogpData)
      cacheDirty = true
      scheduleFlush()
      return ogpData
    }
  } catch (_error) {
    // OGP fetch failed — fall through to the previous entry or a fallback.
  }

  if (previous) return previous

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

let unfetchable: Set<string> | null = null

function loadUnfetchable(): Set<string> {
  if (unfetchable) return unfetchable
  unfetchable = new Set()
  if (!existsSync(UNFETCHABLE_FILE)) return unfetchable

  try {
    const parsed: unknown = JSON.parse(readFileSync(UNFETCHABLE_FILE, "utf8"))
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("expected a JSON object of url -> reason")
    }
    for (const url of Object.keys(parsed)) unfetchable.add(url)
  } catch (error) {
    // Same stance as the cache: a broken list must not break the build.
    console.warn(
      `[link-card] ignoring unreadable list ${UNFETCHABLE_FILE}: ${
        (error as Error).message
      }`,
    )
  }
  return unfetchable
}

function toOgpData(value: unknown): CacheEntry | null {
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
    // Absent in entries written before the TTL existed. `isStale` treats that
    // as expired, so the next online build stamps them.
    fetchedAt:
      typeof record.fetchedAt === "string" ? record.fetchedAt : undefined,
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
  const sorted: Record<string, CacheEntry> = {}
  for (const [url, ogp] of entries) {
    sorted[url] = {
      title: ogp.title,
      description: ogp.description,
      image: ogp.image,
      url: ogp.url,
      siteName: ogp.siteName,
      fetchedAt: ogp.fetchedAt,
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
