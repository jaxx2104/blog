import { visit } from "unist-util-visit"
import type { Root, Element, Text } from "hast"
import { fromHtml } from "hast-util-from-html"
import { fetchOgp, generateLinkCardHtml } from "./link-card"

const URL_REGEX = /^https?:\/\/[^\s]+$/

export default function rehypeLinkCard() {
  return async (tree: Root) => {
    const nodesToReplace: { parent: Element; index: number; url: string }[] = []

    visit(tree, "element", (node: Element, index, parent) => {
      // <p> タグで、中身がテキストのみのURLの場合を検出
      if (
        node.tagName === "p" &&
        node.children.length === 1 &&
        node.children[0].type === "text"
      ) {
        const text = (node.children[0] as Text).value.trim()
        if (URL_REGEX.test(text)) {
          nodesToReplace.push({
            parent: parent as Element,
            index: index as number,
            url: text,
          })
        }
      }

      // <p> タグ内の <a> タグで、テキストがURLと同じ場合も検出
      // 例: <p><a href="https://...">https://...</a></p>
      if (
        node.tagName === "p" &&
        node.children.length === 1 &&
        (node.children[0] as Element).tagName === "a"
      ) {
        const anchor = node.children[0] as Element
        const href = anchor.properties?.href as string
        if (
          href &&
          anchor.children.length === 1 &&
          anchor.children[0].type === "text"
        ) {
          const text = (anchor.children[0] as Text).value.trim()
          if (text === href && URL_REGEX.test(href)) {
            nodesToReplace.push({
              parent: parent as Element,
              index: index as number,
              url: href,
            })
          }
        }
      }
    })

    // OGP情報を並列で取得
    const ogpResults = await Promise.all(
      nodesToReplace.map(async ({ url }) => {
        const ogp = await fetchOgp(url)
        return { url, ogp }
      })
    )

    // ノードを置換（逆順で処理してインデックスがずれないようにする）
    for (let i = nodesToReplace.length - 1; i >= 0; i--) {
      const { parent, index } = nodesToReplace[i]
      const { ogp } = ogpResults[i]

      if (ogp && parent.children) {
        const html = generateLinkCardHtml(ogp)
        const fragment = fromHtml(html, { fragment: true })
        parent.children.splice(index, 1, ...(fragment.children as Element[]))
      }
    }
  }
}
