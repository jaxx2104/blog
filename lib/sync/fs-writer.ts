import { existsSync } from "node:fs"
import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { emitFrontmatter } from "./frontmatter"
import type { Post } from "./types"

function render(post: Post): string {
	const front = emitFrontmatter(post)
	const body = post.body.endsWith("\n") ? post.body : `${post.body}\n`
	return `${front}\n${body}`
}

export async function writePost(post: Post, postsRoot: string): Promise<void> {
	const dir = join(postsRoot, post.id)
	await mkdir(dir, { recursive: true })
	const dest = join(dir, "index.md")
	const next = render(post)
	if (existsSync(dest)) {
		const cur = await readFile(dest, "utf8")
		if (cur === next) return
	}
	const tmp = `${dest}.tmp`
	await writeFile(tmp, next)
	try {
		await rename(tmp, dest)
	} catch (err) {
		await unlink(tmp).catch(() => {})
		throw err
	}
}

export async function deletePost(id: string, postsRoot: string): Promise<void> {
	const dir = join(postsRoot, id)
	await rm(dir, { recursive: true, force: true })
}
