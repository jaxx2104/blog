import { toBodyId } from "./content/normalize"
import type { Post } from "./content/schema"

export type PostMeta = Post

/** One article: metadata and rendered body, as written by `flushContent`. */
export type PostEntry = {
  meta: PostMeta
  body: string
}

/** One page of the paginated index. */
export type IndexPage = {
  page: number
  pageCount: number
  posts: PostMeta[]
}

/**
 * Content is fetched by URL, never imported.
 *
 * That is the whole point of this module. Anything a route reaches through the
 * module graph is part of the bundle: a static import of the metadata put all
 * 117 posts in the chunk every page loads, and reaching the per-post files
 * with `import.meta.glob` instead put the *names* of all 117 emitted chunks —
 * content hashes included — into the entry chunk. Either way, editing one post
 * changed the hash of the 93KB (gzip) bundle holding React and TanStack, and
 * every returning visitor re-downloaded it. Fetching by URL keeps the entry
 * chunk unaware that the content exists.
 *
 * The prerender has no HTTP server to fetch from, so the server side reads the
 * same files from disk. `import.meta.env.SSR` is replaced with a literal at
 * build time, so the `node:` import below is compiled out of the client
 * bundle rather than shipped and skipped.
 */
const CONTENT_ROOT = "/content"

async function loadContent<T>(path: string): Promise<T | undefined> {
  if (import.meta.env.SSR) {
    const [{ readFile }, { join }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ])
    try {
      const raw = await readFile(
        join(process.cwd(), "public", CONTENT_ROOT, path),
        "utf8",
      )
      return JSON.parse(raw) as T
    } catch {
      return undefined // no such page or post
    }
  }

  const response = await fetch(`${CONTENT_ROOT}/${path}`)
  if (!response.ok) return undefined
  return (await response.json()) as T
}

/**
 * One page of the index, newest first. Page 1 is always written — even for an
 * empty content directory — so the home route always resolves.
 */
export async function getIndexPage(
  page: number,
): Promise<IndexPage | undefined> {
  return await loadContent<IndexPage>(`pages/${page}.json`)
}

/**
 * Metadata and body for one article.
 *
 * Permalinks are normalised to `/<slug>/` by lib/content/normalize.ts and the
 * filename is derived from the permalink, so resolving one post needs no index
 * of all of them.
 */
export async function getPost(
  permalink: string,
): Promise<PostEntry | undefined> {
  const bodyId = toBodyId(permalink)
  // Permalinks are single-segment slugs; anything else would escape the
  // content directory once it is joined onto a path.
  if (bodyId === "" || bodyId.includes("/")) return undefined
  return await loadContent<PostEntry>(`posts/${bodyId}.json`)
}
