// lib/sync/scrapbox-to-md.ts
//
// Pure (string) => string translator. Handles only the notation that
// the test table covers. New notation discovered in real Cosense
// content adds a row to the table FIRST, then is implemented here.

const HEADING_LEVELS: Record<2 | 3 | 4, string> = { 4: "#", 3: "##", 2: "###" }

const GYAZO_RE = /^\[https:\/\/gyazo\.com\/([a-zA-Z0-9]+)(?:\.[a-z]+)?\]$/
const SCRAPBOX_FILE_RE =
  /^\[https:\/\/scrapbox\.io\/files\/([a-zA-Z0-9]+\.[a-z]+)\]$/
const URL_TITLE_RE = /^\[(https?:\/\/\S+)\s+(.+)\]$/
const URL_BARE_RE = /^\[(https?:\/\/[^\s\]]+?)([.,;:!?]?)\]$/
const STAR_RE = /^\[(\*+)\s+(.+)\]$/
const INTERNAL_RE = /^\[([^\]]+)\]$/
const CODE_OPEN_RE = /^code:([^\s]+)$/

function transformInline(line: string): string {
  // Whole-line wrappers handled first.
  let m: RegExpMatchArray | null

  m = line.match(GYAZO_RE)
  if (m) return `![](${m[1]}.png)`

  m = line.match(SCRAPBOX_FILE_RE)
  if (m) return `![](${m[1]})`

  m = line.match(URL_TITLE_RE)
  if (m) return `[${m[2]}](${m[1]})`

  m = line.match(URL_BARE_RE)
  if (m) return `<${m[1]}>${m[2]}`

  m = line.match(STAR_RE)
  if (m) {
    const stars = m[1].length
    const text = m[2]
    return stars === 1
      ? `**${text}**`
      : `${HEADING_LEVELS[stars as 2 | 3 | 4] ?? "#"} ${text}`
  }

  m = line.match(INTERNAL_RE)
  if (m && !m[1].startsWith("http")) {
    const content = m[1]
    if (
      content.length > 0 &&
      !/^\s/.test(content) &&
      content.trim().length > 0
    ) {
      return `**${content}**`
    }
  }
  return line
}

export function scrapboxToMarkdown(input: string): string {
  const lines = input.split("\n")
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const codeOpen = raw.match(CODE_OPEN_RE)
    if (codeOpen) {
      const filename = codeOpen[1]
      const ext = filename.includes(".") ? filename.split(".").pop()! : ""
      const code: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith(" ")) {
        code.push(lines[i].slice(1))
        i++
      }
      out.push(`\`\`\`${ext}`)
      out.push(...code)
      out.push("```")
      continue
    }
    out.push(transformInline(raw))
    i++
  }
  return out.join("\n")
}
