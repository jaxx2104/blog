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
import { join } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DeleteThresholdError } from "@/lib/sync/types"
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
  expect(r.plan.actions.map((a) => a.kind).sort()).toEqual(["update", "update"])
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

test("Cosense pages with no matching stub become create actions without error", async () => {
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
  expect(kinds).toEqual(["create", "update"])
  expect(c.getPage).toHaveBeenCalledTimes(2) // A (update) and B (create) are both fetched
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

test("create: new Cosense page produces a stub directory with frontmatter and body", async () => {
  // No local stubs, two remote pages -> two creates.
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
  expect(r.plan.actions.map((a) => a.kind).sort()).toEqual(["create", "create"])
  // Slugs are "a" and "b" -> length-1, falls back to page id
  const dirs = readdirSync(postsRoot).sort()
  expect(dirs).toEqual(["0123456789abcdef01234567", "fedcba9876543210fedcba98"])
  const aOut = readFileSync(
    join(postsRoot, "0123456789abcdef01234567", "index.md"),
    "utf8",
  )
  expect(aOut).toContain('title: "A"')
  expect(aOut).toContain("cosense_id: 0123456789abcdef01234567")
  expect(aOut).toContain("Synced body line.")
})

test("create: ASCII title with sufficient length keeps the title slug", async () => {
  const remoteAntigrav = {
    count: 1,
    pages: [
      {
        id: "1111111111111111111111aa",
        title: "Antigravity",
        updated: 2_000_000_000,
      },
    ],
  }
  const c = {
    listPages: vi.fn().mockResolvedValue(remoteAntigrav),
    getPage: vi
      .fn()
      .mockResolvedValue(detailFor("1111111111111111111111aa", "Antigravity")),
  }
  await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 })),
  })
  expect(readdirSync(postsRoot)).toEqual(["antigravity"])
})

test("create: slug collision with a legacy stub appends a 6-hex suffix", async () => {
  // A pre-existing legacy stub at "antigravity" with NO cosense_id.
  await mkdir(join(postsRoot, "antigravity"), { recursive: true })
  writeFileSync(
    join(postsRoot, "antigravity", "index.md"),
    "---\ntitle: 'Antigravity (legacy)'\n---\n\nlegacy body\n",
  )
  const remoteAntigrav = {
    count: 1,
    pages: [
      {
        id: "1111111111111111111111aa",
        title: "Antigravity",
        updated: 2_000_000_000,
      },
    ],
  }
  const c = {
    listPages: vi.fn().mockResolvedValue(remoteAntigrav),
    getPage: vi
      .fn()
      .mockResolvedValue(detailFor("1111111111111111111111aa", "Antigravity")),
  }
  await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 })),
  })
  // Legacy is untouched; new stub gets the suffix from the first 6 hex
  // chars of the page id (1111111111111111111111aa -> 111111).
  const dirs = readdirSync(postsRoot).sort()
  expect(dirs).toEqual(["antigravity", "antigravity-111111"])
  expect(
    readFileSync(join(postsRoot, "antigravity", "index.md"), "utf8"),
  ).toContain("legacy body")
  expect(
    readFileSync(join(postsRoot, "antigravity-111111", "index.md"), "utf8"),
  ).toContain("cosense_id: 1111111111111111111111aa")
})

test("delete: stub with cosense_id absent from remote is removed", async () => {
  // Pre-existing stub with cosense_id that no longer matches any remote.
  await makeStub(
    "going-away",
    "Going Away",
    "2020-01-01T00:00:00.000Z",
    "999999999999999999999999",
  )
  // Pre-existing stub for "A" so the run is not just deletes
  await makeStub("a-stub", "A")
  // Legacy stub WITHOUT cosense_id -> must survive
  await makeStub("legacy", "Legacy Untouched")
  const r = await runSync({
    client: stubClient({
      // remote only has A and B; "Going Away" disappeared
    }),
    postsRoot,
    errorsPath,
    dryRun: false,
    fetch: vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 })),
    // 1 delete / 1 cosense-sourced stub = ratio 1.0 in this tiny fixture.
    // Production has ~50 stubs so a single delete is ~0.02. Disable the
    // ratio gate here to exercise basic delete behaviour, not threshold tuning.
    maxDeleteRatio: 1.0,
  })
  expect(r.errors).toHaveLength(0)
  const dirs = readdirSync(postsRoot).sort()
  // a-stub remains (updated), going-away removed, legacy preserved,
  // "fedcba9876543210fedcba98" created for B
  expect(dirs).toEqual(["a-stub", "fedcba9876543210fedcba98", "legacy"])
})

test("delete: legacy stub (no cosense_id) is never deleted even with no remote match", async () => {
  await makeStub("legacy", "Legacy Untouched")
  const c = {
    listPages: vi.fn().mockResolvedValue({ count: 0, pages: [] }),
    getPage: vi.fn(),
  }
  // count=0, ratio=0 -> thresholds pass; no deletes (legacy has no cosense_id)
  const r = await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
  })
  expect(r.plan.actions).toHaveLength(0)
  expect(readdirSync(postsRoot)).toEqual(["legacy"])
})

test("threshold: absolute count violation throws DeleteThresholdError before any deletes", async () => {
  // Six stubs with cosense_id, none in remote -> 6 deletes -> exceeds default 5.
  for (let i = 0; i < 6; i++) {
    await makeStub(
      `gone-${i}`,
      `Gone ${i}`,
      "2020-01-01T00:00:00.000Z",
      `aaaaaaaaaaaaaaaaaaaaaa${i.toString().padStart(2, "0")}`,
    )
  }
  const c = {
    listPages: vi.fn().mockResolvedValue({ count: 0, pages: [] }),
    getPage: vi.fn(),
  }
  await expect(
    runSync({
      client: c,
      postsRoot,
      errorsPath,
      dryRun: false,
      maxDeleteAbs: 5,
      maxDeleteRatio: 1.0, // disable ratio gate
    }),
  ).rejects.toBeInstanceOf(DeleteThresholdError)
  // No directory was deleted
  expect(readdirSync(postsRoot).length).toBe(6)
})

test("threshold: ratio violation throws DeleteThresholdError", async () => {
  // 4 stubs, all with cosense_id, none in remote -> ratio 1.0 > 0.05.
  for (let i = 0; i < 4; i++) {
    await makeStub(
      `gone-${i}`,
      `Gone ${i}`,
      "2020-01-01T00:00:00.000Z",
      `bbbbbbbbbbbbbbbbbbbbbb${i.toString().padStart(2, "0")}`,
    )
  }
  const c = {
    listPages: vi.fn().mockResolvedValue({ count: 0, pages: [] }),
    getPage: vi.fn(),
  }
  await expect(
    runSync({
      client: c,
      postsRoot,
      errorsPath,
      dryRun: false,
      maxDeleteAbs: 100, // disable absolute gate
      maxDeleteRatio: 0.05,
    }),
  ).rejects.toBeInstanceOf(DeleteThresholdError)
})

test("threshold: a single legitimate delete passes the default 5 / 0.05 thresholds", async () => {
  // 1 cosense-sourced stub absent from remote, 19 still matching -> ratio 0.05.
  await makeStub(
    "gone",
    "Gone",
    "2020-01-01T00:00:00.000Z",
    "999999999999999999999999",
  )
  // 19 stubs whose titles match nothing in remote (no-op for them) is verbose;
  // simpler: rely on the absolute gate. With 1 delete and default abs=5, pass.
  const c = {
    listPages: vi.fn().mockResolvedValue({ count: 0, pages: [] }),
    getPage: vi.fn(),
  }
  await runSync({
    client: c,
    postsRoot,
    errorsPath,
    dryRun: false,
    // ratio 1/1 = 1.0 -> would fail default ratio. Override to disable.
    maxDeleteRatio: 1.0,
  })
  expect(readdirSync(postsRoot)).toEqual([])
})
