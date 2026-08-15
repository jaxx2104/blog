import type { Element, Root } from "hast"
import { fromHtml } from "hast-util-from-html"
import { describe, expect, it, vi } from "vitest"
import type { OgpData } from "./link-card"
import rehypeLinkCard from "./rehype-link-card"

// The plugin's job is deciding *which* paragraphs become cards and splicing
// the result in. Fetching is someone else's problem, and reaching the network
// from a unit test would make it flaky.
vi.mock("./link-card", () => ({
  fetchOgp: vi.fn(async (url: string) => ({
    title: `title of ${url}`,
    description: "",
    image: "",
    url,
    siteName: "example.com",
  })),
  generateLinkCardHtml: (ogp: OgpData) =>
    `<a href="${ogp.url}" class="link-card">${ogp.title}</a>`,
}))

async function run(html: string): Promise<Root> {
  const tree = fromHtml(html, { fragment: true })
  await rehypeLinkCard()(tree)
  return tree
}

function tagNames(tree: Root): string[] {
  return tree.children
    .filter((node): node is Element => node.type === "element")
    .map((node) => node.tagName)
}

/**
 * Cards are the only top-level anchors a post body can have: markdown wraps
 * inline links in a paragraph, so an `<a>` that is a direct child of the tree
 * got there by replacing one.
 */
function cardHrefs(tree: Root): string[] {
  return tree.children
    .filter((node): node is Element => node.type === "element")
    .filter((node) => node.tagName === "a")
    .map((node) => String(node.properties?.href))
}

describe("rehypeLinkCard", () => {
  it("replaces a paragraph holding nothing but a bare URL", async () => {
    const tree = await run("<p>https://example.com/a</p>")
    expect(tagNames(tree)).toEqual(["a"])
    expect(cardHrefs(tree)).toEqual(["https://example.com/a"])
  })

  it("replaces a paragraph holding a self-linking anchor", async () => {
    const tree = await run(
      '<p><a href="https://example.com/b">https://example.com/b</a></p>',
    )
    expect(cardHrefs(tree)).toEqual(["https://example.com/b"])
  })

  it("keeps the surrounding document intact", async () => {
    const tree = await run(
      "<p>before</p><p>https://example.com/c</p><p>after</p>",
    )
    expect(tagNames(tree)).toEqual(["p", "a", "p"])
  })

  it("cards several paragraphs without shifting the wrong ones", async () => {
    // The regression this guards: replacing a node used to splice the parent's
    // children, so every sibling after it moved.
    const tree = await run(
      [
        "<p>https://example.com/1</p>",
        "<p>prose</p>",
        "<p>https://example.com/2</p>",
        "<p>https://example.com/3</p>",
      ].join(""),
    )
    expect(tagNames(tree)).toEqual(["a", "p", "a", "a"])
    expect(cardHrefs(tree)).toEqual([
      "https://example.com/1",
      "https://example.com/2",
      "https://example.com/3",
    ])
  })

  it.each([
    ["prose around the link", "<p>see https://example.com/ for more</p>"],
    [
      "an anchor whose text is not its href",
      '<p><a href="https://example.com/">example</a></p>',
    ],
    ["a non-http scheme", "<p>ftp://example.com/file</p>"],
    ["a heading", "<h2>https://example.com/</h2>"],
    ["a list item", "<ul><li>https://example.com/</li></ul>"],
  ])("leaves %s alone", async (_name, html) => {
    const tree = await run(html)
    expect(cardHrefs(tree)).toEqual([])
  })
})
