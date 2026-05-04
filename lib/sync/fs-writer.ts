import {
  access,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises"
import { join } from "node:path"
import type { Post } from "./types"

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

export class FrontmatterParseError extends Error {
  constructor(path: string) {
    super(`malformed frontmatter in ${path}: missing --- delimiters`)
    this.name = "FrontmatterParseError"
  }
}

// Only safe for single-line scalar values. Replacing a multi-line YAML
// construct (block scalar `|`/`>`, block sequence under the key, quoted
// multiline string) would orphan the trailing lines. Sync only writes
// `updated_at` and `cosense_id`, both single-line — do not extend this
// to category/tags/description without a YAML-aware rewrite.
function setFmField(fm: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:[ \\t]*.*$`, "m")
  if (re.test(fm)) {
    return fm.replace(re, `${key}: ${value}`)
  }
  return `${fm.trimEnd()}\n${key}: ${value}`
}

function mergeIntoExisting(cur: string, post: Post, indexPath: string): string {
  const m = cur.match(FRONTMATTER_RE)
  if (!m) throw new FrontmatterParseError(indexPath)
  let fm = m[1]
  fm = setFmField(fm, "updated_at", `'${post.updatedAt.toISOString()}'`)
  fm = setFmField(fm, "cosense_id", post.id)
  const body = post.body.endsWith("\n") ? post.body : `${post.body}\n`
  return `---\n${fm}\n---\n\n${body}`
}

export async function updatePost(post: Post, blogDir: string): Promise<void> {
  const indexPath = join(blogDir, "index.md")
  const cur = await readFile(indexPath, "utf8")
  const next = mergeIntoExisting(cur, post, indexPath)
  if (cur === next) return
  const tmp = `${indexPath}.tmp`
  await writeFile(tmp, next)
  try {
    await rename(tmp, indexPath)
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }
}

function renderNewIndex(post: Post): string {
  const fm = [
    `title: ${JSON.stringify(post.title)}`,
    `created_at: '${post.createdAt.toISOString()}'`,
    `updated_at: '${post.updatedAt.toISOString()}'`,
    `cosense_id: ${post.id}`,
  ].join("\n")
  const body = post.body.endsWith("\n") ? post.body : `${post.body}\n`
  return `---\n${fm}\n---\n\n${body}`
}

export async function createPost(post: Post, blogDir: string): Promise<void> {
  // blogDir must already exist (orchestrator's job); ENOENT surfaces
  // through the writeFile below if it does not.
  const indexPath = join(blogDir, "index.md")
  // index.md must NOT exist; throw a clear message if it does.
  try {
    await access(indexPath)
    throw new Error(`index.md already exists at ${indexPath}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }
  const tmp = `${indexPath}.tmp`
  await writeFile(tmp, renderNewIndex(post))
  try {
    await rename(tmp, indexPath)
  } catch (err) {
    await unlink(tmp).catch(() => {})
    throw err
  }
}

export async function deletePost(blogDir: string): Promise<void> {
  await rm(blogDir, { recursive: true, force: true })
}
