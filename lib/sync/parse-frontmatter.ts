const FM_BLOCK_RE = /^---\n([\s\S]*?)\n---/

export interface ParsedFrontmatter {
  title?: string
  updated_at?: string
  cosense_id?: string
}

function unquote(s: string): string {
  if (s.length < 2) return s
  const f = s.charAt(0)
  const l = s.charAt(s.length - 1)
  if ((f === "'" && l === "'") || (f === '"' && l === '"')) {
    return s.slice(1, -1)
  }
  return s
}

function extract(block: string, key: string): string | undefined {
  // The regex matches `key:` followed by whitespace and the value (lazy
  // until trailing whitespace). Restricted to the block text — never
  // crosses the closing `---` because the block was sliced before this
  // function runs.
  const re = new RegExp(`^${key}:[ \\t]+(.+?)[ \\t]*$`, "m")
  const m = block.match(re)
  if (!m) return undefined
  return unquote(m[1])
}

export function parseFrontmatter(text: string): ParsedFrontmatter {
  const m = text.match(FM_BLOCK_RE)
  if (!m) return {}
  const block = m[1]
  const out: ParsedFrontmatter = {}
  const title = extract(block, "title")
  const updated_at = extract(block, "updated_at")
  const cosense_id = extract(block, "cosense_id")
  if (title !== undefined) out.title = title
  if (updated_at !== undefined) out.updated_at = updated_at
  if (cosense_id !== undefined) out.cosense_id = cosense_id
  return out
}
