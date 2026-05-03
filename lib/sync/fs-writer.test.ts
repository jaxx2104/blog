import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test } from "vitest"
import { writePost, deletePost } from "./fs-writer"
import type { Post } from "./types"

let root: string
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "sync-fs-"))
})
afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

const post: Post = {
	id: "0123456789abcdef01234567",
	title: "Sample",
	createdAt: new Date("2026-05-01T00:00:00.000Z"),
	updatedAt: new Date("2026-05-04T00:00:00.000Z"),
	description: "intro",
	tags: [],
	body: "Hello body.",
	images: [],
}

test("writes index.md under content/posts/<id>/", async () => {
	await writePost(post, root)
	const out = readFileSync(join(root, post.id, "index.md"), "utf8")
	expect(out).toContain("title: 'Sample'")
	expect(out).toContain("\n\nHello body.\n")
})

test("second write with identical content does not change mtime", async () => {
	await writePost(post, root)
	const dest = join(root, post.id, "index.md")
	const t1 = statSync(dest).mtimeMs
	await new Promise((r) => setTimeout(r, 20))
	await writePost(post, root)
	expect(statSync(dest).mtimeMs).toBe(t1)
})

test("write with changed content overwrites", async () => {
	await writePost(post, root)
	await writePost({ ...post, body: "Different." }, root)
	expect(readFileSync(join(root, post.id, "index.md"), "utf8")).toContain("Different.")
})

test("deletePost removes the directory", async () => {
	writeFileSync(join(root, "to-delete.md"), "x")
	await writePost(post, root)
	await deletePost(post.id, root)
	expect(() => statSync(join(root, post.id))).toThrow()
	expect(readFileSync(join(root, "to-delete.md"), "utf8")).toBe("x")
})

test("does not leave a .tmp file when write succeeds", async () => {
	await writePost(post, root)
	const dest = join(root, post.id, "index.md")
	expect(() => statSync(`${dest}.tmp`)).toThrow()
})
