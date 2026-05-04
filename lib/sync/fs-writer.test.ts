import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test } from "vitest"
import { updatePost } from "./fs-writer"
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
  description: "intro from cosense",
  tags: ["tag-from-cosense"],
  body: "Hello body.",
  images: [],
}

async function makeStub(dir: string, frontmatter: string, body = "") {
  await mkdir(dir, { recursive: true })
  writeFileSync(join(dir, "index.md"), `---\n${frontmatter}\n---\n\n${body}`)
}

test("preserves existing frontmatter fields and replaces body", async () => {
  const dir = join(root, "2020-foo-a")
  await makeStub(
    dir,
    [
      "title: 'A'",
      "created_at: '2020-01-01T00:00:00.000Z'",
      "updated_at: '2020-01-01T00:00:00.000Z'",
      "path: /a",
      "category: Test",
      "tags:",
      "  - manual",
    ].join("\n"),
    "Old body content.\n",
  )
  await updatePost(post, dir)
  const out = readFileSync(join(dir, "index.md"), "utf8")
  // Preserved
  expect(out).toContain("title: 'A'")
  expect(out).toContain("created_at: '2020-01-01T00:00:00.000Z'")
  expect(out).toContain("path: /a")
  expect(out).toContain("category: Test")
  expect(out).toContain("- manual")
  // Updated
  expect(out).toContain("updated_at: '2026-05-04T00:00:00.000Z'")
  expect(out).toContain("cosense_id: 0123456789abcdef01234567")
  // Body replaced
  expect(out).toContain("\n\nHello body.\n")
  expect(out).not.toContain("Old body content.")
})

test("stamps cosense_id when missing, replaces it when present", async () => {
  const dir = join(root, "stub")
  await makeStub(
    dir,
    [
      "title: 'A'",
      "updated_at: '2020-01-01T00:00:00.000Z'",
      "cosense_id: ffffffffffffffffffffffff",
    ].join("\n"),
  )
  await updatePost(post, dir)
  const out = readFileSync(join(dir, "index.md"), "utf8")
  // Replaced in place, not duplicated
  const idMatches = out.match(/cosense_id:/g) ?? []
  expect(idMatches).toHaveLength(1)
  expect(out).toContain("cosense_id: 0123456789abcdef01234567")
  expect(out).not.toContain("ffffffffffffffffffffffff")
})

test("appends cosense_id at end of frontmatter when missing", async () => {
  const dir = join(root, "stub")
  await makeStub(
    dir,
    ["title: 'A'", "updated_at: '2020-01-01T00:00:00.000Z'"].join("\n"),
  )
  await updatePost(post, dir)
  const out = readFileSync(join(dir, "index.md"), "utf8")
  // Position check: cosense_id appears after updated_at
  const fmEnd = out.indexOf("\n---\n", 4)
  const fm = out.slice(4, fmEnd)
  const updatedIdx = fm.indexOf("updated_at:")
  const cosenseIdx = fm.indexOf("cosense_id:")
  expect(cosenseIdx).toBeGreaterThan(updatedIdx)
})

test("idempotent: second call with same Post does not change mtime", async () => {
  const dir = join(root, "stub")
  await makeStub(
    dir,
    ["title: 'A'", "updated_at: '2020-01-01T00:00:00.000Z'"].join("\n"),
  )
  await updatePost(post, dir)
  const dest = join(dir, "index.md")
  const t1 = statSync(dest).mtimeMs
  await new Promise((r) => setTimeout(r, 20))
  await updatePost(post, dir)
  expect(statSync(dest).mtimeMs).toBe(t1)
})

test("does not leave a .tmp file when write succeeds", async () => {
  const dir = join(root, "stub")
  await makeStub(
    dir,
    ["title: 'A'", "updated_at: '2020-01-01T00:00:00.000Z'"].join("\n"),
  )
  await updatePost(post, dir)
  expect(() => statSync(join(dir, "index.md.tmp"))).toThrow()
})

test("throws clear error when stub frontmatter is malformed", async () => {
  const dir = join(root, "stub")
  await mkdir(dir, { recursive: true })
  writeFileSync(join(dir, "index.md"), "no frontmatter here")
  await expect(updatePost(post, dir)).rejects.toThrow(/frontmatter/i)
})

test("throws when stub index.md does not exist", async () => {
  const dir = join(root, "missing")
  await expect(updatePost(post, dir)).rejects.toThrow(/ENOENT|no such file/i)
})
