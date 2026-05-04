// scripts/sync-cosense.test.ts
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { runSync } from "./sync-cosense"

let root: string
let postsRoot: string
let errorsPath: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sync-int-"))
  postsRoot = join(root, "posts")
  errorsPath = join(root, ".sync-errors.json")
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const REMOTE = {
  count: 2,
  pages: [
    { id: "0123456789abcdef01234567", title: "A", updated: 2_000_000_000 },
    { id: "fedcba9876543210fedcba98", title: "B", updated: 2_000_000_000 },
  ],
}

const detailFor = (id: string, title: string, body = "Synced body line.") => ({
  id,
  title,
  created: 1_000_000_000,
  updated: 2_000_000_000,
  lines: [
    { id: "l1", text: title, userId: "u", created: 1, updated: 1 },
    { id: "l2", text: body, userId: "u", created: 1, updated: 1 },
  ],
})

const stubClient = (overrides: Partial<typeof REMOTE> = {}) => ({
  listPages: vi.fn().mockResolvedValue({ ...REMOTE, ...overrides }),
  getPage: vi
    .fn()
    .mockImplementation((title: string) =>
      Promise.resolve(
        detailFor(
          REMOTE.pages.find((p) => p.title === title)?.id ?? "x",
          title,
        ),
      ),
    ),
})

async function makeStub(
  dir: string,
  title: string,
  updated_at = "2020-01-01T00:00:00.000Z",
  cosense_id?: string,
) {
  await mkdir(join(postsRoot, dir), { recursive: true })
  const lines = [`title: '${title}'`, `updated_at: '${updated_at}'`]
  if (cosense_id) lines.push(`cosense_id: ${cosense_id}`)
  writeFileSync(
    join(postsRoot, dir, "index.md"),
    `---\n${lines.join("\n")}\n---\n\nold body\n`,
  )
}

test("dry-run produces a plan without touching disk", async () => {
  await makeStub("a-stub", "A")
  await makeStub("b-stub", "B")
  const c = stubClient()
  const r = await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: true,
  })
  expect(r.plan.actions.map((a) => a.kind).sort()).toEqual([
    "update",
    "update",
  ])
  expect(r.plan.stubCount).toBe(2)
  expect(c.getPage).not.toHaveBeenCalled()
  // Stubs unchanged
  expect(readFileSync(join(postsRoot, "a-stub", "index.md"), "utf8")).toContain(
    "old body",
  )
})

test("real run updates matched stubs into their existing dirs", async () => {
  await makeStub("a-stub", "A")
  await makeStub("b-stub", "B")
  const fetchStub = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))
  const r = await runSync({
    client: stubClient(),
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: fetchStub,
  })
  expect(r.errors).toHaveLength(0)
  // Stubs updated in-place (not new <id>/ dirs)
  expect(readdirSync(postsRoot).sort()).toEqual(["a-stub", "b-stub"])
  const aOut = readFileSync(join(postsRoot, "a-stub", "index.md"), "utf8")
  expect(aOut).toContain("title: 'A'")
  expect(aOut).toContain("cosense_id: 0123456789abcdef01234567")
  expect(aOut).toContain("updated_at: '2033-05-18T03:33:20.000Z'") // 2_000_000_000 epoch
  expect(aOut).toContain("Synced body line.")
  expect(aOut).not.toContain("old body")
})

test("Cosense pages with no matching stub are skipped without error", async () => {
  await makeStub("a-stub", "A")
  // no stub for B
  const c = stubClient()
  const r = await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
  })
  const kinds = r.plan.actions.map((a) => a.kind).sort()
  expect(kinds).toEqual(["skip", "update"])
  expect(c.getPage).toHaveBeenCalledTimes(1) // only A was fetched
  expect(r.errors).toHaveLength(0)
})

test("per-page error: getPage failure is recorded; other pages succeed", async () => {
  await makeStub("a-stub", "A")
  await makeStub("b-stub", "B")
  const fetchStub = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))
  const c = {
    listPages: vi.fn().mockResolvedValue(REMOTE),
    getPage: vi.fn().mockImplementation((title: string) => {
      if (title === "A") return Promise.reject(new Error("Cosense 503"))
      return Promise.resolve(
        detailFor(
          REMOTE.pages.find((p) => p.title === title)?.id ?? "x",
          title,
        ),
      )
    }),
  }
  const r = await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: fetchStub,
  })
  expect(r.errors).toEqual([{ title: "A", error: "Cosense 503" }])
  // .sync-errors.json was written
  expect(JSON.parse(readFileSync(errorsPath, "utf8"))).toEqual([
    { title: "A", error: "Cosense 503" },
  ])
  // B succeeded despite A failing
  expect(readFileSync(join(postsRoot, "b-stub", "index.md"), "utf8")).toContain(
    "Synced body line.",
  )
  // A's stub was NOT modified
  expect(readFileSync(join(postsRoot, "a-stub", "index.md"), "utf8")).toContain(
    "old body",
  )
})

test("idempotent: second run with no changes does not modify mtime", async () => {
  await makeStub("a-stub", "A")
  await makeStub("b-stub", "B")
  const fetchStub = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))
  await runSync({
    client: stubClient(),
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: fetchStub,
  })
  const dest = join(postsRoot, "a-stub", "index.md")
  const t1 = statSync(dest).mtimeMs
  await new Promise((r) => setTimeout(r, 20))

  // Second run — same Cosense data, but stub now has cosense_id + updated_at
  // matching the remote, so diff returns "unchanged" without calling getPage.
  const c2 = stubClient()
  const r = await runSync({
    client: c2,
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: fetchStub,
  })
  expect(r.plan.actions.every((a) => a.kind === "unchanged")).toBe(true)
  expect(c2.getPage).not.toHaveBeenCalled()
  expect(statSync(dest).mtimeMs).toBe(t1)
})

test("duplicate stub titles abort the whole run", async () => {
  await makeStub("dir-a", "Same Title")
  await makeStub("dir-b", "Same Title")
  await expect(
    runSync({
      client: stubClient(),
      postsRoot,
      errorsPath,
      dryRun: false,
    }),
  ).rejects.toThrow(/duplicate stub title/i)
})
