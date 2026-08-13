import { describe, expect, it } from "vitest"
import {
  buildFeed,
  buildSitemap,
  escapeXml,
  lastModified,
  latestPostDate,
  type SeoPost,
} from "./artifacts"

function post(overrides: Partial<SeoPost> = {}): SeoPost {
  return {
    permalink: "/a-post/",
    title: "A post",
    excerpt: "An excerpt",
    created_at: "2020-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("escapeXml", () => {
  it("escapes the five XML entities", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;")
  })

  it("escapes ampersands before the entities it introduces", () => {
    // A naive ordering would turn < into &lt; and then re-escape that &.
    expect(escapeXml("a<b")).toBe("a&lt;b")
  })

  it("leaves ordinary text alone", () => {
    expect(escapeXml("日本語のテキスト")).toBe("日本語のテキスト")
  })
})

describe("lastModified", () => {
  it("prefers updated_at", () => {
    const p = post({ updated_at: "2021-05-05T00:00:00.000Z" })
    expect(lastModified(p)).toBe("2021-05-05T00:00:00.000Z")
  })

  it("falls back to created_at", () => {
    expect(lastModified(post())).toBe("2020-01-01T00:00:00.000Z")
  })
})

describe("latestPostDate", () => {
  it("finds the newest date regardless of input order", () => {
    const posts = [
      post({ created_at: "2020-01-01T00:00:00.000Z" }),
      post({ created_at: "2024-06-01T00:00:00.000Z" }),
      post({ created_at: "2022-01-01T00:00:00.000Z" }),
    ]
    expect(latestPostDate(posts)).toBe("2024-06-01T00:00:00.000Z")
  })

  it("accounts for updated_at", () => {
    const posts = [
      post({ created_at: "2020-01-01T00:00:00.000Z" }),
      post({
        created_at: "2019-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      }),
    ]
    expect(latestPostDate(posts)).toBe("2025-01-01T00:00:00.000Z")
  })

  it("returns an empty string for no posts", () => {
    expect(latestPostDate([])).toBe("")
  })
})

describe("buildSitemap", () => {
  const xml = buildSitemap([
    post({ permalink: "/first/", created_at: "2020-01-01T00:00:00.000Z" }),
    post({
      permalink: "/second/",
      created_at: "2021-01-01T00:00:00.000Z",
      updated_at: "2024-03-03T00:00:00.000Z",
    }),
  ])

  it("lists home, profile and every post", () => {
    expect(xml).toContain("<loc>https://jaxx2104.info/</loc>")
    expect(xml).toContain("<loc>https://jaxx2104.info/profile/</loc>")
    expect(xml).toContain("<loc>https://jaxx2104.info/first/</loc>")
    expect(xml).toContain("<loc>https://jaxx2104.info/second/</loc>")
  })

  it("dates the home page from the newest post, not the clock", () => {
    expect(xml).toContain(
      "<loc>https://jaxx2104.info/</loc><lastmod>2024-03-03T00:00:00.000Z</lastmod>",
    )
  })

  it("omits lastmod for the profile page", () => {
    const profileEntry = xml
      .split("\n")
      .find((line) => line.includes("/profile/"))
    expect(profileEntry).not.toContain("<lastmod>")
  })

  it("includes the extra pages it is given", () => {
    const withPages = buildSitemap(
      [post()],
      [
        {
          path: "/page/2/",
          lastmod: "2024-03-03T00:00:00.000Z",
          changefreq: "weekly",
          priority: "0.5",
        },
      ],
    )
    expect(withPages).toContain(
      "<loc>https://jaxx2104.info/page/2/</loc><lastmod>2024-03-03T00:00:00.000Z</lastmod><changefreq>weekly</changefreq><priority>0.5</priority>",
    )
  })

  it("escapes permalinks", () => {
    const odd = buildSitemap([post({ permalink: "/a&b/" })])
    expect(odd).toContain("<loc>https://jaxx2104.info/a&amp;b/</loc>")
    expect(odd).not.toContain("<loc>https://jaxx2104.info/a&b/</loc>")
  })

  it("stays well-formed with no posts", () => {
    const empty = buildSitemap([])
    expect(empty).toContain("<urlset")
    expect(empty).not.toContain("<lastmod></lastmod>")
  })
})

describe("buildFeed", () => {
  const xml = buildFeed([
    post({
      permalink: "/older/",
      title: "Older",
      created_at: "2020-01-01T00:00:00.000Z",
    }),
    post({
      permalink: "/newer/",
      title: "Newer",
      created_at: "2024-01-01T00:00:00.000Z",
    }),
  ])

  it("orders items newest first", () => {
    expect(xml.indexOf("<title>Newer</title>")).toBeLessThan(
      xml.indexOf("<title>Older</title>"),
    )
  })

  it("emits RFC 822 dates", () => {
    expect(xml).toContain("<pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>")
  })

  it("derives lastBuildDate from the newest post", () => {
    expect(xml).toContain(
      "<lastBuildDate>Mon, 01 Jan 2024 00:00:00 GMT</lastBuildDate>",
    )
  })

  it("caps the feed at 30 items", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      post({
        permalink: `/post-${i}/`,
        created_at: `20${String(10 + i).padStart(2, "0")}-01-01T00:00:00.000Z`,
      }),
    )
    expect(buildFeed(many).match(/<item>/g)).toHaveLength(30)
  })

  it("escapes titles and excerpts", () => {
    const odd = buildFeed([post({ title: 'Tom & "Jerry"', excerpt: "a < b" })])
    expect(odd).toContain("<title>Tom &amp; &quot;Jerry&quot;</title>")
    expect(odd).toContain("<description>a &lt; b</description>")
  })

  it("omits lastBuildDate rather than emitting an invalid date when empty", () => {
    const empty = buildFeed([])
    expect(empty).not.toContain("lastBuildDate")
    expect(empty).not.toContain("Invalid Date")
  })
})
