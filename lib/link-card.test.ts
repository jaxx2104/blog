import { describe, expect, it } from "vitest"
import { generateLinkCardHtml, isStale, type OgpData } from "./link-card"

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.parse("2026-08-15T00:00:00.000Z")

function entry(fields: Partial<OgpData> & { fetchedAt?: string } = {}) {
  return {
    title: "Example",
    description: "",
    image: "",
    url: "https://example.com/",
    siteName: "example.com",
    ...fields,
  }
}

describe("isStale", () => {
  it("treats a fresh entry as usable", () => {
    const fetchedAt = new Date(NOW - 10 * DAY_MS).toISOString()
    expect(isStale(entry({ fetchedAt }), NOW)).toBe(false)
  })

  it("expires an entry past the TTL", () => {
    const fetchedAt = new Date(NOW - 91 * DAY_MS).toISOString()
    expect(isStale(entry({ fetchedAt }), NOW)).toBe(true)
  })

  it("expires an entry with no timestamp", () => {
    // Everything written before the TTL existed. The next online build
    // re-checks and stamps them.
    expect(isStale(entry(), NOW)).toBe(true)
  })

  it("expires an entry with an unparseable timestamp", () => {
    expect(isStale(entry({ fetchedAt: "last tuesday" }), NOW)).toBe(true)
  })
})

describe("generateLinkCardHtml", () => {
  it("escapes text that would otherwise close an attribute or a tag", () => {
    // OGP values come from third-party pages, and the result is injected with
    // dangerouslySetInnerHTML.
    const html = generateLinkCardHtml(
      entry({
        title: "</a><script>alert(1)</script>",
        description: "quote \" and '",
        url: 'https://example.com/?a="b"',
        siteName: "<b>site</b>",
      }),
    )

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;/a&gt;")
    expect(html).toContain("&quot;")
    expect(html).toContain("&#039;")
    // The href is an attribute value, so its quotes have to be escaped too.
    expect(html).toContain('href="https://example.com/?a=&quot;b&quot;"')
  })

  it("uses the site initial when there is no image", () => {
    const html = generateLinkCardHtml(entry({ image: "" }))
    expect(html).toContain("link-card-no-image")
    expect(html).toContain(">E<")
  })

  it("renders the image when there is one", () => {
    const html = generateLinkCardHtml(
      entry({ image: "https://example.com/og.png" }),
    )
    expect(html).toContain('src="https://example.com/og.png"')
    expect(html).toContain('loading="lazy"')
  })

  it("marks the card as an external link", () => {
    const html = generateLinkCardHtml(entry())
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })
})
