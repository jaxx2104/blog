/**
 * Home-page pagination, shared by the routes, by `vite.config.mts` and by the
 * content layer (`lib/content/schema.ts`, which slices the per-page files).
 *
 * The build imports `pageCount`/`pagePath` to enumerate the prerendered page
 * URLs. Prerender runs with `crawlLinks: false`, so a page that is not listed
 * there is never written to `dist/client/` — keeping the arithmetic in one
 * module is what stops the build, the content layer and the router from
 * disagreeing about how many pages exist.
 *
 * Deliberately dependency-free (not even `.velite` types): `vite.config.mts`
 * pulls it in at config-load time, before the content layer is available.
 */
export const POSTS_PER_PAGE = 20

/** At least 1, so an empty content dir still leaves a home page. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
}

export function pageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * POSTS_PER_PAGE
  return items.slice(start, start + POSTS_PER_PAGE)
}

/** Page 1 is "/" — there is no /page/1/, so each page has one canonical URL. */
export function pagePath(page: number): string {
  return page <= 1 ? "/" : `/page/${page}/`
}

/**
 * Parses the `$page` route param, returning null for anything that could not
 * be a page URL this site emits: non-numeric, zero, negative, zero-padded
 * ("02" would be a second URL for page 2) and 1 (which lives at "/").
 *
 * Whether the page actually exists is not decided here. The content layer
 * writes one file per page and the route loads it by number, so a page beyond
 * the end simply has no file — checking a count here as well would be a second
 * source of truth to keep in sync. Callers turn both null and a missing file
 * into `notFound()`.
 */
export function parsePageParam(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null
  const page = Number(raw)
  return page < 2 ? null : page
}
