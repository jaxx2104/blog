import { describe, expect, it } from "vitest"
import {
  deriveThumbnail,
  EXCERPT_LENGTH,
  normalizeExcerpt,
  toBodyId,
  toPermalink,
} from "./normalize"

/** A UTF-16 surrogate without its partner — what a mid-emoji cut leaves. */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

describe("normalizeExcerpt", () => {
  it("collapses the newlines velite's excerpt carries over from the source", () => {
    expect(normalizeExcerpt("\n最初の段落。\n次の段落。")).toBe(
      "最初の段落。 次の段落。",
    )
  })

  it("collapses runs of whitespace into a single space", () => {
    expect(normalizeExcerpt("a  \t\n  b")).toBe("a b")
  })

  it("leaves a short excerpt untouched", () => {
    expect(normalizeExcerpt("短い抜粋")).toBe("短い抜粋")
  })

  it("truncates to EXCERPT_LENGTH plus an ellipsis", () => {
    const result = normalizeExcerpt("あ".repeat(EXCERPT_LENGTH + 50))
    expect(result).toHaveLength(EXCERPT_LENGTH + 1)
    expect(result.endsWith("…")).toBe(true)
  })

  it("measures the limit after collapsing, not before", () => {
    // 150 chars of content but half of it whitespace: collapsing first keeps
    // it under the limit, so no ellipsis should appear.
    const spaced = Array.from({ length: 50 }, () => "あ").join("\n")
    expect(normalizeExcerpt(spaced).endsWith("…")).toBe(false)
  })

  it("does not split a surrogate pair at the cut", () => {
    const raw = `${"あ".repeat(EXCERPT_LENGTH - 1)}😀${"い".repeat(10)}`
    const result = normalizeExcerpt(raw)
    // The emoji lands exactly on the boundary: a UTF-16 slice would keep only
    // its high surrogate and emit U+FFFD into the meta description.
    expect([...result].at(-2)).toBe("😀")
    expect(result).not.toMatch(LONE_SURROGATE)
    expect([...result]).toHaveLength(EXCERPT_LENGTH + 1)
  })

  it("does not leave a trailing space before the ellipsis", () => {
    const raw = `${"あ".repeat(EXCERPT_LENGTH - 1)} ${"い".repeat(20)}`
    expect(normalizeExcerpt(raw)).not.toContain(" …")
  })
})

describe("toPermalink", () => {
  it("adds the trailing slash frontmatter paths lack", () => {
    expect(
      toPermalink("/php-replace-lf", "posts/2013-08-06-php-replace-lf"),
    ).toBe("/php-replace-lf/")
  })

  it("falls back to the last slug segment when no path is set", () => {
    // Posts without frontmatter `path` are the ones whose directory is
    // already the slug (content/posts/antigravity/index.md).
    expect(toPermalink(undefined, "posts/antigravity")).toBe("/antigravity/")
  })

  it("keeps a date-prefixed directory name verbatim in the fallback", () => {
    // Documents the trade-off: date-prefixed directories rely on an explicit
    // `path` to get a clean URL. Without one the date leaks into the URL.
    expect(toPermalink(undefined, "posts/2013-08-06-php-replace-lf")).toBe(
      "/2013-08-06-php-replace-lf/",
    )
  })

  it("is idempotent for an already normalised path", () => {
    expect(toPermalink("/clay/", "posts/clay")).toBe("/clay/")
  })

  it("collapses repeated slashes at the edges", () => {
    expect(toPermalink("//clay//", "posts/clay")).toBe("/clay/")
  })

  it("handles a slug with no directory prefix", () => {
    expect(toPermalink(undefined, "clay")).toBe("/clay/")
  })
})

describe("toBodyId", () => {
  it("strips the surrounding slashes of a permalink", () => {
    expect(toBodyId("/php-replace-lf/")).toBe("php-replace-lf")
  })

  it("round-trips with toPermalink", () => {
    const permalink = toPermalink("/go-to-nara", "posts/2013-08-07-go-to-nara")
    expect(toPermalink(`/${toBodyId(permalink)}`, "")).toBe(permalink)
  })
})

describe("deriveThumbnail", () => {
  it("picks the src of the first post image", () => {
    const body = '<p>x</p><img src="/images/posts/a-123456.jpg" alt="">'
    expect(deriveThumbnail(body)).toBe("/images/posts/a-123456.jpg")
  })

  it("picks the first when several images are present", () => {
    const body =
      '<img src="/images/posts/a-1.jpg" alt=""><img src="/images/posts/b-2.jpg" alt="">'
    expect(deriveThumbnail(body)).toBe("/images/posts/a-1.jpg")
  })

  it("still matches when other attributes precede src", () => {
    // rehype-image adds width/height/loading, which must not break the match.
    const body =
      '<img width="800" height="600" loading="lazy" src="/images/posts/a-1.jpg" alt="">'
    expect(deriveThumbnail(body)).toBe("/images/posts/a-1.jpg")
  })

  it("ignores images hosted outside /images/posts", () => {
    const body = '<img src="https://example.com/a.jpg" alt="">'
    expect(deriveThumbnail(body)).toBeUndefined()
  })

  it("returns undefined for a body with no images", () => {
    expect(deriveThumbnail("<p>text only</p>")).toBeUndefined()
  })
})
