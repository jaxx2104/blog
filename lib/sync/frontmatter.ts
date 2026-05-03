import type { Post } from "./types"

function quoteIfNeeded(s: string): string {
  // YAML: single-quote strings unless they themselves contain single quotes.
  if (s.includes("'")) return `"${s.replace(/"/g, '\\"')}"`
  return `'${s}'`
}

function plainOrQuoted(s: string): string {
  // Strings that look "safe" (no special chars, no leading whitespace) can
  // go unquoted. Frontmatter consumers (gray-matter via Velite) accept both.
  if (/^[A-Za-z0-9 _.-]+$/.test(s) && s.trim() === s) return s
  return quoteIfNeeded(s)
}

export function emitFrontmatter(post: Post): string {
  const lines: string[] = ["---"]
  lines.push(`title: ${plainOrQuoted(post.title)}`)
  lines.push(`created_at: '${post.createdAt.toISOString()}'`)
  lines.push(`updated_at: '${post.updatedAt.toISOString()}'`)
  lines.push(`path: /${post.id}`)
  lines.push(`description: ${quoteIfNeeded(post.description)}`)
  if (post.tags.length > 0) {
    lines.push("tags:")
    for (const tag of post.tags) lines.push(`  - ${tag}`)
  }
  lines.push("---", "")
  return lines.join("\n")
}
