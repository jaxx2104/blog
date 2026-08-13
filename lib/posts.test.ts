import { describe, expect, it } from "vitest"
import { EXCERPT_LENGTH } from "./content/normalize"
import { getAllPosts, getPostBody, getPostByPermalink } from "./posts"

/**
 * These run against the real .velite output, so they double as a check that
 * the content layer built coherently — the metadata in posts.json and the
 * body files written by the `complete` hook have to stay in sync.
 */
describe("getAllPosts", () => {
  const posts = getAllPosts()

  it("returns posts", () => {
    expect(posts.length).toBeGreaterThan(0)
  })

  it("sorts newest first", () => {
    const dates = posts.map((p) => new Date(p.created_at).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it("exposes permalinks in the canonical /<slug>/ shape", () => {
    const odd = posts.filter((p) => !/^\/[^/]+\/$/.test(p.permalink))
    expect(odd.map((p) => p.permalink)).toEqual([])
  })

  it("has unique permalinks", () => {
    expect(new Set(posts.map((p) => p.permalink)).size).toBe(posts.length)
  })

  it("carries no body in the metadata", () => {
    // Regression guard: a body here means the whole corpus is back in the
    // chunk that every page loads.
    expect(posts.filter((p) => "body" in p)).toEqual([])
  })

  it("keeps excerpts on a single line and within the limit", () => {
    // Measured in code points, like normalizeExcerpt cuts them: one post
    // leads with an emoji, whose UTF-16 length would overshoot the limit.
    const bad = posts.filter(
      (p) =>
        /[\n\r]/.test(p.excerpt) || [...p.excerpt].length > EXCERPT_LENGTH + 1, // +1 for the ellipsis
    )
    expect(bad.map((p) => p.permalink)).toEqual([])
  })
})

describe("getPostByPermalink", () => {
  it("finds a post by its canonical permalink", () => {
    const first = getAllPosts()[0]
    expect(getPostByPermalink(first.permalink)?.permalink).toBe(first.permalink)
  })

  it("returns undefined for an unknown permalink", () => {
    expect(getPostByPermalink("/does-not-exist/")).toBeUndefined()
  })

  it("does not match a permalink missing its trailing slash", () => {
    // Routes normalise before calling; this documents that the lookup itself
    // is exact rather than forgiving.
    const first = getAllPosts()[0]
    expect(getPostByPermalink(first.permalink.slice(0, -1))).toBeUndefined()
  })
})

describe("getPostBody", () => {
  it("resolves a body for every post", async () => {
    const missing: string[] = []
    for (const post of getAllPosts()) {
      const body = await getPostBody(post.bodyId)
      if (typeof body !== "string" || body.length === 0)
        missing.push(post.bodyId)
    }
    expect(missing).toEqual([])
  })

  it("returns undefined for an unknown id", async () => {
    await expect(getPostBody("does-not-exist")).resolves.toBeUndefined()
  })

  it("returns rendered HTML, not markdown", async () => {
    const withThumbnail = getAllPosts().find((p) => p.thumbnail)
    expect(withThumbnail).toBeDefined()
    const body = await getPostBody(withThumbnail?.bodyId ?? "")
    expect(body).toContain(withThumbnail?.thumbnail ?? "")
  })
})
