export interface RedirectSeedEntry {
  old_path: string
  new_id: string
}

export function emitRedirects(seed: RedirectSeedEntry[]): string {
  if (seed.length === 0) return ""
  const seen = new Set<string>()
  const lines: string[] = []
  for (const entry of seed) {
    if (seen.has(entry.old_path)) {
      throw new Error(`duplicate old_path in redirects seed: ${entry.old_path}`)
    }
    seen.add(entry.old_path)
    lines.push(`${entry.old_path} /${entry.new_id}/ 308`)
  }
  lines.push("")
  return lines.join("\n")
}
