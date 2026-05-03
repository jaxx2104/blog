import { scrapboxToMarkdown } from "./scrapbox-to-md"
import type { CosensePage, ImageRef, Post } from "./types"

const HASHTAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu
const GYAZO_RE = /\[https:\/\/gyazo\.com\/([a-zA-Z0-9]+)(\.[a-z]+)?\]/g
const SCRAPBOX_FILE_RE = /\[https:\/\/scrapbox\.io\/files\/([a-zA-Z0-9]+\.[a-z]+)\]/g

function extractTags(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(HASHTAG_RE)) out.add(m[1])
  return [...out]
}

function extractImages(text: string): ImageRef[] {
  const out: ImageRef[] = []
  for (const m of text.matchAll(GYAZO_RE)) {
    const ext = m[2] ?? ".png"
    out.push({ url: `https://gyazo.com/${m[1]}${ext}`, filename: `${m[1]}${ext}` })
  }
  for (const m of text.matchAll(SCRAPBOX_FILE_RE)) {
    out.push({
      url: `https://scrapbox.io/files/${m[1]}`,
      filename: m[1],
    })
  }
  return out
}

function firstProseLine(bodyLines: string[]): string {
  for (const l of bodyLines) {
    const trimmed = l.trim()
    if (trimmed.length === 0) continue
    if (trimmed.startsWith("#")) continue // hashtag-only line
    if (trimmed.startsWith("[")) continue // image / heading line
    return trimmed.length > 160 ? trimmed.slice(0, 160) : trimmed
  }
  return ""
}

export function transformPage(page: CosensePage): Post {
  const bodyLines = page.lines.slice(1).map((l) => l.text)
  const rawBody = bodyLines.join("\n")
  return {
    id: page.id,
    title: page.title,
    createdAt: new Date(page.created * 1000),
    updatedAt: new Date(page.updated * 1000),
    description: firstProseLine(bodyLines),
    tags: extractTags(rawBody),
    body: scrapboxToMarkdown(rawBody),
    images: extractImages(rawBody),
  }
}
