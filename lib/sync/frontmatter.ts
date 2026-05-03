import type { Post } from "./types"

function quoteScalar(s: string): string {
  if (/[\n\r]/.test(s)) {
    throw new Error(
      `frontmatter scalar must not contain newlines: ${JSON.stringify(s)}`,
    )
  }
  // YAML: single-quote unless the value itself contains a single quote.
  // In that case use double quotes and escape backslashes (first) and
  // double quotes (second). Order matters — if we escaped " before \,
  // the inserted backslashes would get doubled too.
  if (s.includes("'")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }
  return `'${s}'`
}

export function emitFrontmatter(post: Post): string {
  const lines: string[] = ["---"]
  lines.push(`title: ${quoteScalar(post.title)}`)
  lines.push(`created_at: '${post.createdAt.toISOString()}'`)
  lines.push(`updated_at: '${post.updatedAt.toISOString()}'`)
  lines.push(`path: /${post.id}`)
  lines.push(`description: ${quoteScalar(post.description)}`)
  if (post.tags.length > 0) {
    lines.push("tags:")
    for (const tag of post.tags) lines.push(`  - ${tag}`)
  }
  lines.push("---", "")
  return lines.join("\n")
}
