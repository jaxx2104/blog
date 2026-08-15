import { describe, expect, it } from "vitest"
import { EXCERPT_LENGTH } from "./content/normalize"
import { POSTS_PER_PAGE } from "./pagination"
import { getIndexPage, getPost, type PostMeta } from "./posts"

/**
 * These run against the real .velite output, so they double as a check that
 * the content layer built coherently — the per-page files and the per-post
 * files are written from the same array and have to agree.
 */
const firstPage = await getIndexPage(1)
if (!firstPage) throw new Error("no index page 1: did velite build run?")

const pages = await Promise.all(
  Array.from({ length: firstPage.pageCount }, (_, i) => getIndexPage(i + 1)),
)
const allPosts: PostMeta[] = pages.flatMap((page) => page?.posts ?? [])

describe("getIndexPage", () => {
  it("writes every page the count promises", () => {
    expect(pages.filter((page) => page === undefined)).toEqual([])
  })

  it("returns posts", () => {
    expect(allPosts.length).toBeGreaterThan(0)
  })

  it("puts at most one page worth of posts on a page", () => {
    const oversized = pages.filter(
      (page) => (page?.posts.length ?? 0) > POSTS_PER_PAGE,
    )
    expect(oversized.map((page) => page?.page)).toEqual([])
  })

  it("sorts newest first across page boundaries", () => {
    const dates = allPosts.map((p) => new Date(p.created_at).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it("exposes permalinks in the canonical /<slug>/ shape", () => {
    const odd = allPosts.filter((p) => !/^\/[^/]+\/$/.test(p.permalink))
    expect(odd.map((p) => p.permalink)).toEqual([])
  })

  it("has unique permalinks", () => {
    expect(new Set(allPosts.map((p) => p.permalink)).size).toBe(allPosts.length)
  })

  it("carries no body in the index metadata", () => {
    // Regression guard: a body here means every index page ships the full
    // text of the 20 posts it lists.
    expect(allPosts.filter((p) => "body" in p)).toEqual([])
  })

  it("keeps excerpts on a single line and within the limit", () => {
    // Measured in code points, like normalizeExcerpt cuts them: one post
    // leads with an emoji, whose UTF-16 length would overshoot the limit.
    const bad = allPosts.filter(
      (p) =>
        /[\n\r]/.test(p.excerpt) || [...p.excerpt].length > EXCERPT_LENGTH + 1, // +1 for the ellipsis
    )
    expect(bad.map((p) => p.permalink)).toEqual([])
  })

  it("returns undefined past the last page", async () => {
    await expect(getIndexPage(firstPage.pageCount + 1)).resolves.toBeUndefined()
  })
})

describe("getPost", () => {
  it("resolves metadata and a body for every post in the index", async () => {
    const broken: string[] = []
    for (const post of allPosts) {
      const entry = await getPost(post.permalink)
      if (!entry || entry.meta.permalink !== post.permalink) {
        broken.push(post.permalink)
        continue
      }
      if (typeof entry.body !== "string" || entry.body.length === 0) {
        broken.push(post.permalink)
      }
    }
    expect(broken).toEqual([])
  })

  it("returns undefined for an unknown permalink", async () => {
    await expect(getPost("/does-not-exist/")).resolves.toBeUndefined()
  })

  it("normalises the permalink it is given", async () => {
    // The filename is derived from the permalink rather than matched against
    // a list, so a missing trailing slash resolves to the same post. Routes
    // pass the canonical form anyway; this documents which way it errs.
    const permalink = allPosts[0].permalink
    const entry = await getPost(permalink.slice(0, -1))
    expect(entry?.meta.permalink).toBe(permalink)
  })

  it.each(["/../../etc/passwd/", "//", "/a/b/", "/"])(
    "refuses to look up %o",
    async (permalink) => {
      // The permalink becomes a path segment, so anything with a separator
      // left in it after normalising has to be rejected rather than joined.
      await expect(getPost(permalink)).resolves.toBeUndefined()
    },
  )

  it("returns rendered HTML, not markdown", async () => {
    const withThumbnail = allPosts.find((p) => p.thumbnail)
    expect(withThumbnail).toBeDefined()
    const entry = await getPost(withThumbnail?.permalink ?? "")
    expect(entry?.body).toContain(withThumbnail?.thumbnail ?? "")
  })
})
