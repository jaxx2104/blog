/**
 * Pure normalisation helpers used by the velite schema.
 *
 * They live outside schema.ts so tests can import them without pulling in
 * velite and its markdown pipeline.
 */

/**
 * Length of the excerpt that feeds meta description / OGP / RSS.
 * The previous value (40) produced descriptions cut mid-sentence.
 */
export const EXCERPT_LENGTH = 120

/**
 * `s.excerpt()` slices the raw plain text of the markdown, which still
 * carries the source's paragraph breaks — 86 of 117 posts had newlines in
 * the middle of their meta description. Collapse the whitespace first, then
 * cut, so the limit applies to what actually gets rendered.
 */
export function normalizeExcerpt(raw: string): string {
  const flat = raw.replace(/\s+/g, " ").trim()
  // Count and cut by code point. String.slice works in UTF-16 units, so an
  // emoji sitting on the boundary would be cut in half and emit a lone
  // surrogate into the meta description.
  const chars = [...flat]
  return chars.length > EXCERPT_LENGTH
    ? `${chars.slice(0, EXCERPT_LENGTH).join("").trimEnd()}…`
    : flat
}

/**
 * Canonical permalink shape: leading and trailing slash.
 *
 * Older posts carry an explicit `path` in their frontmatter
 * (`/php-replace-lf`, no trailing slash) while newer ones fall back to the
 * slug. Normalising here means consumers — routes, sitemap, feed — can rely
 * on one shape instead of each re-normalising.
 */
export function toPermalink(path: string | undefined, slug: string): string {
  // s.path() yields "posts/<dir>" for content/posts/<dir>/index.md
  const raw = path ?? slug.split("/").pop() ?? slug
  return `/${raw.replace(/^\/+|\/+$/g, "")}/`
}

/** Body filename stem. Permalinks are unique and slug-safe, so this is too. */
export function toBodyId(permalink: string): string {
  return permalink.replace(/^\/+|\/+$/g, "")
}

const THUMBNAIL_RE = /<img[^>]+src="(\/images\/posts\/[^"]+)"/

/**
 * First in-body image, used as the post's og:image. Derived at build time
 * because the body no longer travels with the metadata.
 */
export function deriveThumbnail(body: string): string | undefined {
  return body.match(THUMBNAIL_RE)?.[1]
}
