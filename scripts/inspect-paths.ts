import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const postsDir = path.join(process.cwd(), "content/posts")
const dirs = fs.readdirSync(postsDir)

let withPath = 0
let withoutPath = 0
let skipped = 0
const slashCounts = new Map<number, number>()
const mismatches: { slug: string; path: string }[] = []

for (const dir of dirs) {
  const full = path.join(postsDir, dir, "index.md")
  if (!fs.existsSync(full)) {
    skipped += 1
    continue
  }
  const { data } = matter(fs.readFileSync(full, "utf8"))
  const fmPath = typeof data.path === "string" ? data.path : undefined

  if (fmPath) {
    withPath += 1
    const slashes = (fmPath.match(/\//g) ?? []).length
    slashCounts.set(slashes, (slashCounts.get(slashes) ?? 0) + 1)

    const slugTail = dir.replace(/^\d{4}-\d{2}-\d{2}-/, "")
    const expected = `/${slugTail}`
    if (fmPath !== expected) {
      mismatches.push({ slug: dir, path: fmPath })
    }
  } else {
    withoutPath += 1
  }
}

console.log("With frontmatter.path:    ", withPath)
console.log("Without frontmatter.path: ", withoutPath)
console.log("Skipped (no index.md):    ", skipped)
console.log("Slash counts in path:     ", Object.fromEntries(slashCounts))
console.log("Slugs whose path != /<slug-without-date> :", mismatches.length)
if (mismatches.length > 0) {
  console.log("Sample mismatches (up to 10):")
  for (const m of mismatches.slice(0, 10)) {
    console.log(`  ${m.slug}  ->  ${m.path}`)
  }
}
