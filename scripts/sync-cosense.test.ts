// scripts/sync-cosense.test.ts
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { runSync } from "./sync-cosense"

const listJson = JSON.parse(
  readFileSync(
    resolve(__dirname, "../lib/sync/__fixtures__/pages-list.json"),
    "utf8",
  ),
)
const detailJson = JSON.parse(
  readFileSync(
    resolve(__dirname, "../lib/sync/__fixtures__/page-detail.json"),
    "utf8",
  ),
)

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-int-"))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const stubClient = () => ({
  listPages: vi.fn().mockResolvedValue(listJson),
  getPage: vi.fn().mockImplementation((title: string) => {
    const page = listJson.pages.find(
      (p: { title: string }) => p.title === title,
    )
    // Return a full page detail whose id matches the list entry so each post
    // lands in its own directory on disk. Fall back to the fixture for unknown titles.
    return Promise.resolve(
      page ? { ...detailJson, id: page.id, title: page.title } : detailJson,
    )
  }),
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

test("real run creates post directories and is idempotent", async () => {
  const c1 = stubClient()
  const fetchStub = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))
  await mkdir(join(root, "posts"), { recursive: true })

  await runSync({
    client: c1,
    postsRoot: join(root, "posts"),
    redirectsPath: join(root, "_redirects"),
    seed: [],
    maxDeleteRatio: 0.5,
    dryRun: false,
    fetch: fetchStub,
  })
  const id = listJson.pages[0].id
  const dest = join(root, "posts", id, "index.md")
  expect(readFileSync(dest, "utf8")).toContain(`path: /${id}`)
  const mtime1 = statSync(dest).mtimeMs
  const getPageCallsAfterFirst = c1.getPage.mock.calls.length

  // Second run with a fresh stub (mtime check below is the actual idempotency proof).
  await new Promise((r) => setTimeout(r, 20))
  const c2 = stubClient()
  await runSync({
    client: c2,
    postsRoot: join(root, "posts"),
    redirectsPath: join(root, "_redirects"),
    seed: [],
    maxDeleteRatio: 0.5,
    dryRun: false,
    fetch: fetchStub,
  })
  // No second-run getPage calls because both pages are now "unchanged".
  expect(c2.getPage).not.toHaveBeenCalled()
  // Initial run did call getPage twice (once per fixture page).
  expect(getPageCallsAfterFirst).toBe(listJson.pages.length)
  // mtime unchanged — fs-writer.writePost short-circuited the no-op.
  expect(statSync(dest).mtimeMs).toBe(mtime1)
})

test("aborts when deletes exceed ratio", async () => {
  await mkdir(join(root, "posts", "deadbeefdeadbeefdeadbeef"), {
    recursive: true,
  })
  writeFileSync(
    join(root, "posts", "deadbeefdeadbeefdeadbeef", "index.md"),
    `---\nupdated_at: '2026-01-01T00:00:00.000Z'\n---\n`,
  )
  await mkdir(join(root, "posts", "cafebabecafebabecafebabe"), {
    recursive: true,
  })
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
