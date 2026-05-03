// scripts/sync-cosense.test.ts
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { runSync } from "./sync-cosense"

const listJson = JSON.parse(
  readFileSync(resolve(__dirname, "../lib/sync/__fixtures__/pages-list.json"), "utf8"),
)
const detailJson = JSON.parse(
  readFileSync(resolve(__dirname, "../lib/sync/__fixtures__/page-detail.json"), "utf8"),
)

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-int-"))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const stubClient = (detail = detailJson) => ({
  listPages: vi.fn().mockResolvedValue(listJson),
  getPage: vi.fn().mockResolvedValue(detail),
})

test("dry-run produces a plan without touching disk", async () => {
  const c = stubClient()
  const r = await runSync({
    client: c,
    postsRoot: join(root, "posts"),
    redirectsPath: join(root, "_redirects"),
    seed: [],
    maxDeleteRatio: 0.5,
    dryRun: true,
  })
  expect(r.plan.actions.map((a) => a.kind).sort()).toEqual(["create", "create"])
  expect(c.getPage).not.toHaveBeenCalled()
  expect(readdirSync(root)).toEqual([])
})

test("real run creates post directories", async () => {
  const c = stubClient()
  const fetchStub = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([1]), { status: 200 }),
  )
  await mkdir(join(root, "posts"), { recursive: true })
  await runSync({
    client: c,
    postsRoot: join(root, "posts"),
    redirectsPath: join(root, "_redirects"),
    seed: [],
    maxDeleteRatio: 0.5,
    dryRun: false,
    fetch: fetchStub,
  })
  const id = listJson.pages[0].id
  expect(readFileSync(join(root, "posts", id, "index.md"), "utf8")).toContain(`path: /${id}`)
})

test("aborts when deletes exceed ratio", async () => {
  await mkdir(join(root, "posts", "deadbeefdeadbeefdeadbeef"), { recursive: true })
  writeFileSync(
    join(root, "posts", "deadbeefdeadbeefdeadbeef", "index.md"),
    `---\nupdated_at: '2026-01-01T00:00:00.000Z'\n---\n`,
  )
  await mkdir(join(root, "posts", "cafebabecafebabecafebabe"), { recursive: true })
  writeFileSync(
    join(root, "posts", "cafebabecafebabecafebabe", "index.md"),
    `---\nupdated_at: '2026-01-01T00:00:00.000Z'\n---\n`,
  )
  await expect(
    runSync({
      client: stubClient(),
      postsRoot: join(root, "posts"),
      redirectsPath: join(root, "_redirects"),
      seed: [],
      maxDeleteRatio: 0.5,
      dryRun: false,
    }),
  ).rejects.toThrow(/would delete/)
})
