import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { s } from "velite"
import {
  deriveThumbnail,
  EXCERPT_LENGTH,
  normalizeExcerpt,
  toBodyId,
  toPermalink,
} from "./normalize"

/**
 * Rendered bodies collected while parsing, written out by `flushBodies`.
 *
 * They are kept out of .velite/posts.json: with the bodies inline posts.json
 * was 595KB, and the entry chunk imports it statically, so every page shipped
 * all 117 bodies (116KB gzip) to render one. lib/posts.ts reaches the files
 * written here through `import.meta.glob`, one chunk per post.
 *
 * They also cannot be written during parsing — `output.clean` wipes .velite
 * after the collections are parsed but before they are written, so an early
 * write is deleted again. Hence the two-step flush from the `complete` hook.
 */
const pendingBodies = new Map<string, string>()

/**
 * Writes the collected bodies and drops files whose post no longer exists.
 *
 * `bodyDir` is passed in rather than derived from `import.meta.url`: velite
 * bundles the config into a temp file before importing it, so a path relative
 * to this module resolves outside the project. Callers derive it from
 * `context.config.configPath`, which is the real config location.
 */
export async function flushBodies(
  bodyDir: string,
  keep: Iterable<string>,
): Promise<void> {
  await mkdir(bodyDir, { recursive: true })
  await Promise.all(
    [...pendingBodies].map(([bodyId, body]) =>
      writeFile(join(bodyDir, `${bodyId}.json`), JSON.stringify(body), "utf8"),
    ),
  )
  pendingBodies.clear()

  const wanted = new Set([...keep].map((bodyId) => `${bodyId}.json`))
  const existing = await readdir(bodyDir)
  await Promise.all(
    existing
      .filter((name) => !wanted.has(name))
      .map((name) => rm(join(bodyDir, name), { force: true })),
  )
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
 * It is written next to it by `flushBodies` and reached via `bodyId`.
 */
export type Post = ReturnType<typeof postSchema.parse>
