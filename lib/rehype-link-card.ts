import type { Element, Root, RootContent } from "hast"
import { fromHtml } from "hast-util-from-html"
import { visit } from "unist-util-visit"
import { fetchOgp, generateLinkCardHtml } from "./link-card"

const URL_REGEX = /^https?:\/\/[^\s]+$/

/**
 * The URL a paragraph consists of, if it consists of nothing else.
 *
 * Two shapes count, and markdown produces both from the same source line
 * depending on whether the URL was autolinked:
 *
 *     <p>https://example.com/</p>
 *     <p><a href="https://example.com/">https://example.com/</a></p>
 *
 * A paragraph with prose around the link, or a link whose text differs from
 * its href, is deliberately left as it is — the author wrote it inline.
 */
function soleUrl(node: Element): string | undefined {
  if (node.tagName !== "p" || node.children.length !== 1) return undefined
  const child = node.children[0]

  if (child.type === "text") {
    const text = child.value.trim()
    return URL_REGEX.test(text) ? text : undefined
  }

  if (child.type === "element" && child.tagName === "a") {
    const href = child.properties?.href
    if (typeof href !== "string") return undefined
    if (child.children.length !== 1) return undefined
    const label = child.children[0]
    if (label.type !== "text") return undefined
    if (label.value.trim() !== href) return undefined
    return URL_REGEX.test(href) ? href : undefined
  }

  return undefined
}

/** The card's markup is one `<a>`; anything else in the fragment is noise. */
function firstElement(nodes: RootContent[]): Element | undefined {
  return nodes.find((node): node is Element => node.type === "element")
}

export default function rehypeLinkCard() {
  return async (tree: Root) => {
    const found: { replace: (card: Element) => void; url: string }[] = []

    visit(tree, "element", (node, index, parent) => {
      if (parent === undefined || index === undefined) return
      const url = soleUrl(node)
      if (url === undefined) return
      // An Element is legal wherever the paragraph it replaces was, but hast
      // types the child arrays per parent kind (ElementContent[] for an
      // element, RootContent[] for the root, plus the mdx variants visit
      // knows about). Widening once here beats casting the parent.
      const siblings = parent.children as RootContent[]
      found.push({ url, replace: (card) => siblings.splice(index, 1, card) })
    })

    // Deduplication and caching happen inside fetchOgp; this only needs the
    // results in the same order as the nodes.
    const cards = await Promise.all(found.map(({ url }) => fetchOgp(url)))

    for (const [i, { replace }] of found.entries()) {
      const ogp = cards[i]
      if (!ogp) continue
      const card = firstElement(
        fromHtml(generateLinkCardHtml(ogp), { fragment: true }).children,
      )
      // One node in, one node out, so the sibling indices captured above stay
      // valid whatever order the replacements are applied in.
      if (card) replace(card)
    }
  }
}
