import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { s } from "velite"
import { pageCount, pageSlice } from "../pagination"
import {
  deriveThumbnail,
  EXCERPT_LENGTH,
  normalizeExcerpt,
  toBodyId,
  toPermalink,
} from "./normalize"

/**
 * Rendered bodies collected while parsing, written out by `flushContent`.
 *
 * They are kept out of .velite/posts.json: with the bodies inline posts.json
 * was 595KB, and the entry chunk imports it statically, so every page shipped
 * all 117 bodies (116KB gzip) to render one.
 *
 * They also cannot be written during parsing — `output.clean` wipes .velite
 * after the collections are parsed but before they are written, so an early
 * write is deleted again. Hence the two-step flush from the `complete` hook.
 */
const pendingBodies = new Map<string, string>()

/** Drops files in `dir` that this build did not write. */
async function pruneDir(dir: string, keep: Set<string>): Promise<void> {
  const existing = await readdir(dir)
  await Promise.all(
    existing
      .filter((name) => !keep.has(name))
      .map((name) => rm(join(dir, name), { force: true, recursive: true })),
  )
}

/** Newest first, the order every index page and the feed are built from. */
function byNewest<T extends { created_at: string }>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

/**
 * Writes the per-post and per-index-page files the routes read at runtime.
 *
 * The shape is dictated by what a single page needs, because anything the
 * routes reach through the module graph ends up in the entry chunk that
 * *every* page downloads:
 *
 * - `posts/<bodyId>.json` — one article's metadata and body together, so an
 *   article page resolves in one request.
 * - `pages/<n>.json` — the 20 metas of one index page, plus the page count the
 *   pager needs. Previously the routes read the whole 117-post metadata array,
 *   which cost every visitor a 22KB (gzip) chunk to render 20 rows.
 *
 * These land under `public/`, not `.velite/`, and the client fetches them by
 * URL. Reaching them with `import.meta.glob` instead looks tidier but puts the
 * name of all 117 emitted chunks — content hashes included — into the entry
 * chunk, so editing any post changes the hash of the 93KB (gzip) bundle that
 * holds React and TanStack. Measured: the glob map was inside index-*.js.
 *
 * `outDir` is passed in rather than derived from `import.meta.url`: velite
 * bundles the config into a temp file before importing it, so a path relative
 * to this module resolves outside the project. Callers derive it from
 * `context.config.configPath`, which is the real config location.
 */
export async function flushContent(
  outDir: string,
  posts: Post[],
): Promise<void> {
  const sorted = byNewest(posts)
  const postDir = join(outDir, "posts")
  const pageDir = join(outDir, "pages")
  await Promise.all([
    mkdir(postDir, { recursive: true }),
    mkdir(pageDir, { recursive: true }),
  ])

  await Promise.all(
    sorted.map((meta) =>
      writeFile(
        join(postDir, `${meta.bodyId}.json`),
        JSON.stringify({ meta, body: pendingBodies.get(meta.bodyId) ?? "" }),
        "utf8",
      ),
    ),
  )
  pendingBodies.clear()

  // pageCount() floors at 1, so an empty content directory still leaves a
  // home page for the route to load.
  const total = pageCount(sorted.length)
  const pages = Array.from({ length: total }, (_, i) => i + 1)
  await Promise.all(
    pages.map((page) =>
      writeFile(
        join(pageDir, `${page}.json`),
        JSON.stringify({
          page,
          pageCount: total,
          posts: pageSlice(sorted, page),
        }),
        "utf8",
      ),
    ),
  )

  await Promise.all([
    pruneDir(postDir, new Set(sorted.map((p) => `${p.bodyId}.json`))),
    pruneDir(pageDir, new Set(pages.map((page) => `${page}.json`))),
  ])
}

export const postSchema = s
  .object({
    title: s.string().min(1),
    created_at: s.isodate(),
    updated_at: s.isodate().optional(),
    path: s.string().regex(/^\/.+/, "path must start with '/'").optional(),
    category: s.string().optional(),
    tags: s
      .array(s.string())
      .nullish()
      .transform((v) => v ?? []),
    slug: s.path(),
    body: s.markdown(),
    // Over-fetch: collapsing whitespace in normalizeExcerpt() shortens the
    // slice, so cutting at EXCERPT_LENGTH here would leave it too short.
    excerpt: s.excerpt({ length: EXCERPT_LENGTH * 3 }),
  })
  .transform(({ body, ...meta }) => {
    const permalink = toPermalink(meta.path, meta.slug)
    const bodyId = toBodyId(permalink)
    pendingBodies.set(bodyId, body)
    return {
      ...meta,
      excerpt: normalizeExcerpt(meta.excerpt),
      permalink,
      bodyId,
      thumbnail: deriveThumbnail(body),
    }
  })

/**
 * What actually lands in .velite/posts.json — note there is no `body`.
 * That file is only read by the build (vite.config.mts, for the prerender
 * URL list and the SEO artifacts); the client reads the per-post and
 * per-page files written by `flushContent`.
 */
export type Post = ReturnType<typeof postSchema.parse>
