# Cosense sync — Phase 2 (publish-from-Cosense) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Phase 1 sync engine from "Cosense is the source of truth, publish every page at `/<page-id>/`" into "blog post stubs are the publishing decision; Cosense edits flow into matched stubs by title, leaving everything else alone."

**Architecture:** Title-then-id matching between Cosense pages and `content/posts/*/index.md` stubs. Sync only updates posts that already have a stub. Cosense-only pages are skipped (no auto-publish). Existing URLs are preserved (no `/<page-id>/` URLs introduced). The cron is enabled in this phase.

**Tech Stack:** Same as Phase 1 — TypeScript 5.9, vitest, zod, tsx, pnpm 9, Cosense REST API, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-04-cosense-phase-2-design.md`.

**Branch:** `feat/cosense-sync-phase-2`, already created from `origin/main` per CLAUDE.md.

---

## File Structure

**Created:**

- `lib/sync/parse-frontmatter.ts` — small regex-based extractor for the three fields the orchestrator needs (`title`, `updated_at`, `cosense_id`). Coexists with existing 109 posts' varied YAML quoting.
- `lib/sync/parse-frontmatter.test.ts` — covers single-quote, double-quote, unquoted, missing-field, malformed cases.

**Modified:**

- `lib/sync/cosense-client.ts` — replace pagination assertion with a `skip`-loop.
- `lib/sync/cosense-client.test.ts` — rewrite the pagination test to assert the loop walks the full project.
- `lib/sync/types.ts` — drop `SyncAction.create` and `SyncAction.delete`; add `SyncAction.skip`. Drop `SyncPlan.localCount`; add `SyncPlan.stubCount`. Add `blogDir` carry on `update` actions.
- `lib/sync/diff.ts` — replace id-based diff with title-then-id matching. Drop the `delete` branch. Throw on duplicate stub titles.
- `lib/sync/diff.test.ts` — rewrite for the new behavior.
- `lib/sync/fs-writer.ts` — drop `writePost` and `deletePost`. Add `updatePost(post, blogDir)` that merges into the existing `<blogDir>/index.md` (preserves existing frontmatter, replaces body, stamps `cosense_id` and `updated_at`).
- `lib/sync/fs-writer.test.ts` — rewrite for `updatePost` semantics.
- `scripts/sync-cosense.ts` — adopt new diff signature, replace `writePost`/`deletePost` calls, drop `MAX_DELETE_RATIO`, drop redirects emission, add per-page error tolerance writing `.sync-errors.json`, expand `readLocalStateAt` to scan all post directories (not just 24-hex), use `parseFrontmatter`.
- `scripts/sync-cosense.test.ts` — rewrite integration test for the new flow (pre-existing stubs, update semantics, skip count, error logging).
- `.github/workflows/sync.yml` — enable `schedule:` cron, drop `MAX_DELETE_RATIO` env, change commit-step glob from `content public` to `content`, upload `.sync-errors.json` artifact alongside `.sync-plan.json`.

**Deleted:**

- `lib/sync/redirects.ts` and `lib/sync/redirects.test.ts` — Phase 2 never writes `public/_redirects`.
- `lib/sync/frontmatter.ts` and `lib/sync/frontmatter.test.ts` — Phase 2's fs-writer no longer renders frontmatter from scratch; it merges into existing stubs.

**Untouched:** `lib/sync/transform.ts`, `lib/sync/scrapbox-to-md.ts`, `lib/sync/slug.ts`, `lib/sync/images.ts`, `lib/sync/__fixtures__/*`, `lib/sync/types.ts`'s `Post`/`ImageRef`/`Cosense*` schemas, `app/`, `components/`, `styles/`, `velite.config.ts`, `vite.config.mts`, the existing 109 post directories themselves.

**Notes on intermediate-state breakage:** Tasks 2, 3, and 4 each leave the orchestrator type-failing because they remove a symbol it depends on. Type-checks come fully green again at the end of Task 5 (orchestrator refactor). vitest may also fail per-module until then. This is a deliberate trade-off — the alternative (interim adapters) adds churn the plan would just delete in the next task. Implementers should verify only the touched module's tests per task and run the full `pnpm test` + `pnpm test:unit` at Task 5's commit gate.

---

## Task 1: Pagination loop in `cosense-client.ts`

**Files:**
- Modify: `lib/sync/cosense-client.ts`
- Modify: `lib/sync/cosense-client.test.ts`

Phase 1 asserted-and-aborted on `count > pages.length`. Phase 2 enables cron, so we must actually paginate.

- [ ] **Step 1: Replace the pagination test**

Open `lib/sync/cosense-client.test.ts`. Find the test `"listPages aborts when count > pages.length (pagination needed)"` and DELETE it. In its place, add this loop test inside the same `describe("CosenseClient", ...)` block:

```ts
test("listPages walks the project via skip-loop until count is reached", async () => {
  const page1 = {
    count: 3,
    pages: [
      { id: "0123456789abcdef01234567", title: "A", updated: 1 },
      { id: "fedcba9876543210fedcba98", title: "B", updated: 2 },
    ],
  }
  const page2 = {
    count: 3,
    pages: [{ id: "1111111111111111111111aa", title: "C", updated: 3 }],
  }
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }))
  const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
  const result = await c.listPages()
  expect(result.pages).toHaveLength(3)
  expect(result.pages.map((p) => p.title)).toEqual(["A", "B", "C"])
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "https://scrapbox.io/api/pages/demo?limit=1000&skip=0",
    expect.any(Object),
  )
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "https://scrapbox.io/api/pages/demo?limit=1000&skip=2",
    expect.any(Object),
  )
})

test("listPages stops on the first empty page even if count claims more", async () => {
  // Defensive: if Cosense returns an empty page batch, do not loop forever.
  const page1 = {
    count: 100,
    pages: [{ id: "0123456789abcdef01234567", title: "A", updated: 1 }],
  }
  const page2 = { count: 100, pages: [] }
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }))
  const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
  const result = await c.listPages()
  expect(result.pages).toHaveLength(1)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run the test, confirm red**

Run: `pnpm test:unit lib/sync/cosense-client.test.ts`
Expected: 2 new tests fail (current `listPages` only fetches once, returns 2 instead of 3, and never re-fetches).

- [ ] **Step 3: Implement the loop**

Edit `lib/sync/cosense-client.ts`. Add `CosenseListEntry` to the import from `./types`:

```ts
import {
  type CosenseListEntry,
  type CosensePage,
  cosenseListResponseSchema,
  cosensePageSchema,
} from "./types"
```

Then replace the entire `listPages()` method with:

```ts
  async listPages(): Promise<{ count: number; pages: CosenseListEntry[] }> {
    const limit = 1000
    const all: CosenseListEntry[] = []
    let skip = 0
    let count = Number.POSITIVE_INFINITY
    while (all.length < count) {
      const url = `${BASE}/${encodeURIComponent(this.project)}?limit=${limit}&skip=${skip}`
      const r = await this.fetcher(url, { headers: this.headers() })
      if (!r.ok) throw new Error(`Cosense list failed: ${r.status}`)
      const parsed = cosenseListResponseSchema.parse(await r.json())
      if (parsed.pages.length === 0) break
      all.push(...parsed.pages)
      count = parsed.count
      skip += parsed.pages.length
    }
    return { count, pages: all }
  }
```

- [ ] **Step 4: Run the test, confirm green**

Run: `pnpm test:unit lib/sync/cosense-client.test.ts`
Expected: all tests in this file pass (including pre-existing ones).

Also run: `pnpm test`
Expected: tsc clean.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/cosense-client.ts lib/sync/cosense-client.test.ts
git commit -m "Cosense client: replace pagination assertion with skip-loop"
```

---

## Task 2: Add `parse-frontmatter` module

**Files:**
- Create: `lib/sync/parse-frontmatter.ts`
- Create: `lib/sync/parse-frontmatter.test.ts`

The orchestrator needs to read three fields from existing post stubs: `title`, `updated_at`, `cosense_id`. The 109 existing posts have mixed quoting (single, double, unquoted), so a tiny regex-based parser is safer than gray-matter (broken via `js-yaml@4` overrides — see `scripts/sync-cosense.ts`'s `UPDATED_AT_RE` comment) and lighter than adding a new dep.

- [ ] **Step 1: Write the failing test**

Create `lib/sync/parse-frontmatter.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { parseFrontmatter } from "./parse-frontmatter"

describe("parseFrontmatter", () => {
  test("extracts unquoted title", () => {
    const text = `---
title: 買ってよかったもの2025
created_at: '2025-12-15T00:00:00.000Z'
---

body
`
    expect(parseFrontmatter(text)).toEqual({
      title: "買ってよかったもの2025",
      created_at: "2025-12-15T00:00:00.000Z",
    })
  })

  test("extracts double-quoted title", () => {
    const text = `---
title: "Don't break"
updated_at: "2013-08-06T00:22:48+00:00"
---
`
    expect(parseFrontmatter(text)).toEqual({
      title: "Don't break",
      updated_at: "2013-08-06T00:22:48+00:00",
    })
  })

  test("extracts cosense_id when present, omits when absent", () => {
    const text = `---
title: 'Foo'
cosense_id: 0123456789abcdef01234567
updated_at: '2025-01-01T00:00:00.000Z'
---
`
    expect(parseFrontmatter(text)).toEqual({
      title: "Foo",
      updated_at: "2025-01-01T00:00:00.000Z",
      cosense_id: "0123456789abcdef01234567",
    })
  })

  test("returns empty object when no frontmatter block exists", () => {
    expect(parseFrontmatter("just body, no fences")).toEqual({})
  })

  test("returns empty object when block is malformed (no closing ---)", () => {
    expect(parseFrontmatter("---\ntitle: Foo\nbody")).toEqual({})
  })

  test("ignores fields outside the frontmatter block", () => {
    const text = `---
title: Real
---

cosense_id: deadbeefdeadbeefdeadbeef
`
    expect(parseFrontmatter(text)).toEqual({ title: "Real" })
  })

  test("strips matched outer quotes only (does not unescape)", () => {
    // Existing posts may have title: "Use \\\"escapes\\\""; we deliberately
    // do not interpret YAML escapes — strip only the outer quote pair.
    const text = `---
title: "Use \\\"escapes\\\""
---
`
    expect(parseFrontmatter(text).title).toBe('Use \\"escapes\\"')
  })
})
```

- [ ] **Step 2: Run, confirm red**

Run: `pnpm test:unit lib/sync/parse-frontmatter.test.ts`
Expected: FAIL with `Cannot find module './parse-frontmatter'`.

- [ ] **Step 3: Implement**

Create `lib/sync/parse-frontmatter.ts`:

```ts
const FM_BLOCK_RE = /^---\n([\s\S]*?)\n---/

export interface ParsedFrontmatter {
  title?: string
  updated_at?: string
  cosense_id?: string
}

function unquote(s: string): string {
  if (s.length < 2) return s
  const f = s.charAt(0)
  const l = s.charAt(s.length - 1)
  if ((f === "'" && l === "'") || (f === '"' && l === '"')) {
    return s.slice(1, -1)
  }
  return s
}

function extract(block: string, key: string): string | undefined {
  // The regex matches `key:` followed by whitespace and the value (lazy
  // until trailing whitespace). Restricted to the block text — never
  // crosses the closing `---` because the block was sliced before this
  // function runs.
  const re = new RegExp(`^${key}:[ \\t]+(.+?)[ \\t]*$`, "m")
  const m = block.match(re)
  if (!m) return undefined
  return unquote(m[1])
}

export function parseFrontmatter(text: string): ParsedFrontmatter {
  const m = text.match(FM_BLOCK_RE)
  if (!m) return {}
  const block = m[1]
  const out: ParsedFrontmatter = {}
  const title = extract(block, "title")
  const updated_at = extract(block, "updated_at")
  const cosense_id = extract(block, "cosense_id")
  if (title !== undefined) out.title = title
  if (updated_at !== undefined) out.updated_at = updated_at
  if (cosense_id !== undefined) out.cosense_id = cosense_id
  return out
}
```

- [ ] **Step 4: Run, confirm green**

Run: `pnpm test:unit lib/sync/parse-frontmatter.test.ts`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/parse-frontmatter.ts lib/sync/parse-frontmatter.test.ts
git commit -m "Add parse-frontmatter for stub frontmatter extraction"
```

---

## Task 3: Refactor `types.ts` and `diff.ts` for title-then-id matching

**Files:**
- Modify: `lib/sync/types.ts`
- Modify: `lib/sync/diff.ts`
- Modify: `lib/sync/diff.test.ts`

This task leaves `scripts/sync-cosense.ts` type-failing (it references `SyncAction.create` and `SyncAction.delete` which are about to disappear). Task 5 fixes the orchestrator. Run only the diff test in this task.

- [ ] **Step 1: Update `types.ts`**

In `lib/sync/types.ts`, replace the existing `SyncAction` and `SyncPlan` definitions with:

```ts
/** Output of diff stage. */
export type SyncAction =
  | { kind: "update"; page: CosenseListEntry; blogDir: string }
  | { kind: "unchanged"; id: string }
  | { kind: "skip"; title: string; reason: "no-stub" }

export interface SyncPlan {
  actions: SyncAction[]
  /** Number of stub directories scanned in `content/posts/`. */
  stubCount: number
}
```

Leave the `Post`, `ImageRef`, `Cosense*` schemas, and `PAGE_ID_RE` untouched.

- [ ] **Step 2: Replace the `diff.test.ts` content**

Replace the entire contents of `lib/sync/diff.test.ts` with:

```ts
import { describe, expect, test } from "vitest"
import { computePlan, type LocalPostState } from "./diff"
import type { CosenseListEntry } from "./types"

const remote: CosenseListEntry[] = [
  { id: "0123456789abcdef01234567", title: "A", updated: 1000 },
  { id: "fedcba9876543210fedcba98", title: "B", updated: 2000 },
]

describe("computePlan", () => {
  test("no stubs -> all skip", () => {
    const plan = computePlan(remote, [])
    expect(plan.actions.map((a) => a.kind)).toEqual(["skip", "skip"])
    expect(plan.stubCount).toBe(0)
  })

  test("title match with newer remote -> update carries blogDir", () => {
    const local: LocalPostState[] = [
      {
        blogDir: "2020-foo-a",
        title: "A",
        updatedAt: new Date(500 * 1000),
      },
    ]
    const plan = computePlan(remote, local)
    const update = plan.actions.find((a) => a.kind === "update")
    expect(update).toBeDefined()
    if (update?.kind === "update") {
      expect(update.page.id).toBe("0123456789abcdef01234567")
      expect(update.blogDir).toBe("2020-foo-a")
    }
  })

  test("title match with older-or-equal remote -> unchanged", () => {
    const local: LocalPostState[] = [
      {
        blogDir: "2020-foo-a",
        title: "A",
        updatedAt: new Date(1000 * 1000),
      },
    ]
    const plan = computePlan(remote, local)
    const unchanged = plan.actions.find((a) => a.kind === "unchanged")
    expect(unchanged).toBeDefined()
  })

  test("id match wins over title match (Cosense page renamed)", () => {
    // Cosense page id matches a stub even though title now differs.
    const local: LocalPostState[] = [
      {
        blogDir: "2020-renamed",
        title: "Old Title",
        cosenseId: "0123456789abcdef01234567",
        updatedAt: new Date(500 * 1000),
      },
    ]
    const plan = computePlan(remote, local)
    const update = plan.actions.find((a) => a.kind === "update")
    expect(update).toBeDefined()
    if (update?.kind === "update") expect(update.blogDir).toBe("2020-renamed")
  })

  test("no matching stub -> skip with title", () => {
    const plan = computePlan(remote, [])
    const skip = plan.actions[0]
    expect(skip.kind).toBe("skip")
    if (skip.kind === "skip") {
      expect(skip.title).toBe("A")
      expect(skip.reason).toBe("no-stub")
    }
  })

  test("title comparison normalises NFC", () => {
    // Single composed character vs decomposed (NFD) form of the same string.
    const composed = "é" // é (NFC, single codepoint)
    const decomposed = "é" // é (NFD, e + combining acute)
    const remoteNfd: CosenseListEntry[] = [
      { id: "0123456789abcdef01234567", title: decomposed, updated: 1000 },
    ]
    const local: LocalPostState[] = [
      { blogDir: "stub", title: composed, updatedAt: new Date(500 * 1000) },
    ]
    const plan = computePlan(remoteNfd, local)
    expect(plan.actions[0].kind).toBe("update")
  })

  test("duplicate stub titles abort the whole run", () => {
    const local: LocalPostState[] = [
      { blogDir: "a", title: "Same", updatedAt: new Date(0) },
      { blogDir: "b", title: "Same", updatedAt: new Date(0) },
    ]
    expect(() => computePlan(remote, local)).toThrow(/duplicate stub title/i)
  })
})
```

- [ ] **Step 3: Run, confirm red**

Run: `pnpm test:unit lib/sync/diff.test.ts`
Expected: tests fail (current diff has different signature; types differ).

- [ ] **Step 4: Replace `diff.ts`**

Replace the entire contents of `lib/sync/diff.ts` with:

```ts
import type { CosenseListEntry, SyncAction, SyncPlan } from "./types"

export interface LocalPostState {
  blogDir: string
  title: string
  cosenseId?: string
  updatedAt: Date
}

function nfc(s: string): string {
  return s.normalize("NFC")
}

export function computePlan(
  remote: CosenseListEntry[],
  local: LocalPostState[],
): SyncPlan {
  const byTitle = new Map<string, LocalPostState>()
  const byId = new Map<string, LocalPostState>()
  for (const stub of local) {
    const key = nfc(stub.title)
    if (byTitle.has(key)) {
      throw new Error(
        `duplicate stub title: ${JSON.stringify(stub.title)} (in ${stub.blogDir} and ${byTitle.get(key)!.blogDir})`,
      )
    }
    byTitle.set(key, stub)
    if (stub.cosenseId) byId.set(stub.cosenseId, stub)
  }

  const actions: SyncAction[] = []
  for (const page of remote) {
    const stub = byId.get(page.id) ?? byTitle.get(nfc(page.title))
    if (!stub) {
      actions.push({ kind: "skip", title: page.title, reason: "no-stub" })
      continue
    }
    if (Math.floor(stub.updatedAt.getTime() / 1000) >= page.updated) {
      actions.push({ kind: "unchanged", id: page.id })
    } else {
      actions.push({ kind: "update", page, blogDir: stub.blogDir })
    }
  }
  return { actions, stubCount: local.length }
}
```

- [ ] **Step 5: Run, confirm green for diff (orchestrator will fail)**

Run: `pnpm test:unit lib/sync/diff.test.ts`
Expected: 7/7 green.

Do NOT run `pnpm test` (tsc) at this point — the orchestrator will not compile. Task 5 fixes that.

- [ ] **Step 6: Commit**

```bash
git add lib/sync/types.ts lib/sync/diff.ts lib/sync/diff.test.ts
git commit -m "Refactor diff to title-then-id matching; drop create/delete actions"
```

---

## Task 4: Refactor `fs-writer.ts` and drop `frontmatter.ts`

**Files:**
- Modify: `lib/sync/fs-writer.ts`
- Modify: `lib/sync/fs-writer.test.ts`
- Delete: `lib/sync/frontmatter.ts`
- Delete: `lib/sync/frontmatter.test.ts`

This task leaves `scripts/sync-cosense.ts` type-failing (it imports `writePost`, `deletePost`). Task 5 fixes that.

- [ ] **Step 1: Replace the test file**

Replace the entire contents of `lib/sync/fs-writer.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run, confirm red**

Run: `pnpm test:unit lib/sync/fs-writer.test.ts`
Expected: all tests fail (`updatePost` is not exported yet).

- [ ] **Step 3: Replace `fs-writer.ts`**

Replace the entire contents of `lib/sync/fs-writer.ts` with:

```ts
import { existsSync } from "node:fs"
import { readFile, rename, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { Post } from "./types"

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

export class FrontmatterParseError extends Error {
  constructor(path: string) {
    super(`malformed frontmatter in ${path}: missing --- delimiters`)
    this.name = "FrontmatterParseError"
  }
}

function setFmField(fm: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:[ \\t]*.*$`, "m")
  if (re.test(fm)) {
    return fm.replace(re, `${key}: ${value}`)
  }
  return `${fm.trimEnd()}\n${key}: ${value}`
}

function mergeIntoExisting(
  cur: string,
  post: Post,
  indexPath: string,
): string {
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

// existsSync is imported but used by callers (downloadImages, etc.) — keep
// the import here to avoid forcing every caller to re-import for no reason.
// (Actually unused in this file post-refactor; remove if biome complains.)
void existsSync
```

If biome flags the unused `existsSync` import, simply delete the import line and the trailing `void existsSync` statement.

- [ ] **Step 4: Delete `frontmatter.ts` and its test**

```bash
rm lib/sync/frontmatter.ts lib/sync/frontmatter.test.ts
```

- [ ] **Step 5: Run, confirm green for fs-writer (orchestrator still fails)**

Run: `pnpm test:unit lib/sync/fs-writer.test.ts`
Expected: 7/7 green.

Do NOT run `pnpm test` (tsc) — the orchestrator still imports `writePost`/`deletePost`. Task 5 fixes that.

- [ ] **Step 6: Commit**

```bash
git add lib/sync/fs-writer.ts lib/sync/fs-writer.test.ts lib/sync/frontmatter.ts lib/sync/frontmatter.test.ts
git commit -m "fs-writer: replace writePost/deletePost with updatePost (merge into stub); drop frontmatter module"
```

---

## Task 5: Refactor orchestrator + drop `redirects.ts`

**Files:**
- Modify: `scripts/sync-cosense.ts`
- Delete: `lib/sync/redirects.ts`
- Delete: `lib/sync/redirects.test.ts`

This is the task that brings the build back to green.

- [ ] **Step 1: Delete the redirects module**

```bash
rm lib/sync/redirects.ts lib/sync/redirects.test.ts
```

- [ ] **Step 2: Replace `scripts/sync-cosense.ts`**

Replace the entire contents of `scripts/sync-cosense.ts` with:

```ts
// scripts/sync-cosense.ts
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { updatePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { parseFrontmatter } from "@/lib/sync/parse-frontmatter"
import { transformPage } from "@/lib/sync/transform"
import type { SyncPlan } from "@/lib/sync/types"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
})

const POSTS_ROOT = resolve(process.cwd(), "content/posts")
const PLAN_PATH = resolve(process.cwd(), ".sync-plan.json")
const ERRORS_PATH = resolve(process.cwd(), ".sync-errors.json")

interface Args {
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  return {
    dryRun: argv.includes("--dry-run") || process.env.SYNC_DRY_RUN === "true",
  }
}

export interface SyncError {
  title: string
  error: string
}

export interface RunOptions {
  client: Pick<CosenseClient, "listPages" | "getPage">
  postsRoot: string
  errorsPath: string
  dryRun: boolean
  fetch?: typeof globalThis.fetch
}

export interface RunResult {
  plan: SyncPlan
  errors: SyncError[]
}

export async function runSync(opts: RunOptions): Promise<RunResult> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  if (opts.dryRun) return { plan, errors: [] }

  const errors: SyncError[] = []
  for (const action of plan.actions) {
    if (action.kind !== "update") continue
    try {
      const page = await opts.client.getPage(action.page.title)
      const post = transformPage(page)
      const dir = join(opts.postsRoot, action.blogDir)
      await downloadImages(post.images, dir, { fetch: opts.fetch })
      await updatePost(post, dir)
    } catch (err) {
      errors.push({
        title: action.page.title,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (errors.length > 0) {
    await writeFile(opts.errorsPath, JSON.stringify(errors, null, 2))
  }
  return { plan, errors }
}

async function readLocalStateAt(postsRoot: string): Promise<LocalPostState[]> {
  let entries: string[]
  try {
    entries = await readdir(postsRoot)
  } catch {
    return []
  }
  const out: LocalPostState[] = []
  for (const dir of entries) {
    let text: string
    try {
      text = await readFile(join(postsRoot, dir, "index.md"), "utf8")
    } catch {
      // Not a post directory (no index.md, or not a directory at all).
      continue
    }
    const fm = parseFrontmatter(text)
    if (!fm.title) continue
    out.push({
      blogDir: dir,
      title: fm.title,
      cosenseId: fm.cosense_id,
      updatedAt: fm.updated_at ? new Date(fm.updated_at) : new Date(0),
    })
  }
  return out
}

function summarise(plan: SyncPlan, errors: SyncError[]): string {
  let update = 0
  let unchanged = 0
  let skip = 0
  for (const a of plan.actions) {
    if (a.kind === "update") update++
    else if (a.kind === "unchanged") unchanged++
    else skip++
  }
  return `plan: ${update} update, ${unchanged} unchanged, ${skip} skip(no-stub), ${errors.length} errors (stubs: ${plan.stubCount})`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)
  runSync({
    client: new CosenseClient({
      project: env.COSENSE_PROJECT,
      sid: env.COSENSE_SID,
    }),
    postsRoot: POSTS_ROOT,
    errorsPath: ERRORS_PATH,
    dryRun: args.dryRun,
  })
    .then(async ({ plan, errors }) => {
      console.log(summarise(plan, errors))
      if (args.dryRun) {
        await writeFile(PLAN_PATH, JSON.stringify(plan, null, 2))
      }
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
```

- [ ] **Step 3: Verify the build is fully green**

Run: `pnpm test`
Expected: tsc clean (no errors).

Run: `pnpm test:unit`
Expected: full suite green except possibly the integration test in `scripts/sync-cosense.test.ts` (which still references the old `RunOptions` shape with `seed`/`maxDeleteRatio`/`redirectsPath`). Task 6 rewrites it. If the integration test fails on the now-removed fields, that's expected — note the failing test name and proceed.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-cosense.ts lib/sync/redirects.ts lib/sync/redirects.test.ts
git commit -m "Orchestrator: title-then-id sync, per-page error tolerance, drop redirects + delete-ratio"
```

---

## Task 6: Update orchestrator integration test

**Files:**
- Modify: `scripts/sync-cosense.test.ts`

- [ ] **Step 1: Replace the test file**

Replace the entire contents of `scripts/sync-cosense.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run, confirm green**

Run: `pnpm test:unit`
Expected: full suite green (10+ files, all tests passing).

Also: `pnpm test`
Expected: tsc clean.

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-cosense.test.ts
git commit -m "Integration test: stub-based update flow + per-page error logging"
```

---

## Task 7: Workflow update — enable cron, drop env, upload errors

**Files:**
- Modify: `.github/workflows/sync.yml`

- [ ] **Step 1: Replace the workflow file**

Replace the entire contents of `.github/workflows/sync.yml` with:

```yaml
name: Sync from Cosense
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry-run only (writes .sync-plan.json, no commit)"
        required: false
        type: boolean
        default: false

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      - run: corepack enable
      - uses: actions/setup-node@v6
        with:
          node-version-file: ./.node-version
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Run sync
        run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
      - name: Commit & push (skipped on dry-run)
        if: ${{ !inputs.dry_run }}
        run: |
          if [ -n "$(git status --porcelain content)" ]; then
            git config user.name  "blog-sync[bot]"
            git config user.email "blog-sync@users.noreply.github.com"
            git add content
            git commit -m "sync: pull from Cosense"
            git push origin main
          fi
      - name: Surface skipped/errored pages
        if: always() && hashFiles('.sync-errors.json') != ''
        run: |
          echo "### Per-page sync errors" >> $GITHUB_STEP_SUMMARY
          echo '```json' >> $GITHUB_STEP_SUMMARY
          jq . .sync-errors.json >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
      - name: Upload sync artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: sync-output
          path: |
            .sync-plan.json
            .sync-errors.json
          if-no-files-found: ignore
```

Key changes from Phase 1:
- `schedule:` cron added (`*/30 * * * *`).
- `MAX_DELETE_RATIO` env removed (orchestrator no longer reads it).
- Commit step stages only `content` (Phase 1 staged `content public` but Phase 2 never writes to `public`).
- New "Surface skipped/errored pages" step writes `.sync-errors.json` to the workflow run summary.
- Artifact upload renamed from `sync-plan` to `sync-output` and now includes both `.sync-plan.json` and `.sync-errors.json`. `if-no-files-found: ignore` keeps the step from failing on a clean run.
- `if: ${{ !inputs.dry_run }}` uses the recommended GitHub Actions expression syntax (Phase 1 had `if: ! inputs.dry_run` which technically works but is non-idiomatic).

- [ ] **Step 2: Sanity-check YAML indentation**

Run: `pnpm exec biome format .github/workflows/sync.yml --check 2>&1 || true`
biome doesn't lint YAML, so the check should be a no-op. Visually verify:
- 2-space indentation throughout.
- `schedule:` at the same level as `workflow_dispatch:`.
- All `if:` expressions use `${{ ... }}` form.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync.yml
git commit -m "sync workflow: enable cron, drop MAX_DELETE_RATIO, upload sync-errors artifact"
```

---

## Task 8: Acceptance check

**Files:** none modified.

- [ ] **Step 1: Lint and full test sweep**

```bash
pnpm lint:ci
pnpm test
pnpm test:unit
pnpm build
```

All four must pass. If `lint:ci` complains, run `pnpm lint` and re-stage, then re-run `pnpm lint:ci`.

- [ ] **Step 2: Local dry-run against the real Cosense project**

```bash
COSENSE_PROJECT=jaxx2104 COSENSE_SID=placeholder pnpm sync --dry-run
cat .sync-plan.json | jq '{stubCount, actionCounts: ([.actions[].kind] | group_by(.) | map({key: .[0], count: length}) | from_entries)}'
```

Expected output shape (counts may shift slightly as Cosense changes, but the kinds breakdown is the acceptance gate):

```json
{
  "stubCount": 109,
  "actionCounts": {
    "skip": 3,
    "unchanged": 0,
    "update": 48
  }
}
```

(`unchanged` may be > 0 if some posts have not been edited in Cosense since their last manual blog edit. The key invariants are: `skip` counts the Cosense pages with no blog stub — should be exactly 3 right now: `Antigravity`, `clay`, `kashitaka`; `update + unchanged + skip` totals the Cosense page count from the spec, currently 51.)

- [ ] **Step 3: Clean up the dry-run artifact**

```bash
rm -f .sync-plan.json
git status --short    # expect clean
```

- [ ] **Step 4: PR**

Open a PR from `feat/cosense-sync-phase-2` to `main`. Title: `feat: Cosense sync — Phase 2 (publish-from-Cosense)`. Body should:

- Link the spec at `docs/superpowers/specs/2026-05-04-cosense-phase-2-design.md`.
- Summarise the model shift from Phase 1 (source-of-truth) to Phase 2 (stub-as-publish-flag).
- Include the dry-run output from Step 2 as evidence the new matching works on real data.
- Note that **the cron is enabled in this PR** — the very first cron tick after merge will start writing sync commits. Recommend triggering one workflow_dispatch with `dry_run: true` immediately after merge to confirm the secrets/env are configured before the cron runs unattended.
- List Phase 2 follow-ups now possible:
  - Author manually creates blog stubs for `Antigravity`, `clay`, `kashitaka` (one-time gesture).
  - Optional `pnpm blog:promote "Title"` helper script (deferred).
  - Make `COSENSE_SID` optional for public projects (deferred).

- [ ] **Step 5: After merge — first cron-driven sync**

Immediately after merge, trigger `gh workflow run sync.yml --field dry_run=true` from the GitHub web UI (the workflow file must exist on the default branch first, so it cannot be triggered from a feature branch — wait until merged to main).

Verify:
- The workflow run completes successfully.
- The `sync-output` artifact contains a `.sync-plan.json` with the same shape as Step 2.
- No `.sync-errors.json` is uploaded (or it's empty).

If that's clean, the next cron tick (within 30 minutes) will perform a real sync. The first real sync will commit body changes for the matched 48 posts and stamp `cosense_id:` into each one. Inspect the auto-commit on `main` before walking away — if anything looks wrong, revert the commit (`git revert <sha>`); the `cosense_id:` stamps will be re-applied on the next sync.

---

## Self-review notes (for the implementer)

- **Intermediate task breakage is by design.** Tasks 3, 4 leave `pnpm test` (tsc) failing because the orchestrator references symbols that have been removed. Task 5 is the convergence point. Resist the urge to add temporary adapter shims — they would just be deleted in Task 5 and add review noise.
- **The `parseFrontmatter` regex tolerates the existing 109 posts' mixed quoting** (single, double, unquoted) because the user's history has all three. Do not "improve" it to a stricter format without re-checking against actual `content/posts/*/index.md` content.
- **`fs-writer.updatePost` does not call `mkdir`** because the stub directory must already exist (the user created it). Do not add a defensive `mkdir` — that would mask the bug where sync silently creates a stub the user didn't intend.
- **NFC normalisation in `diff.ts` is load-bearing.** macOS file systems can decompose Unicode in filenames and (sometimes) in YAML stored on disk. The 109 existing posts span a decade of macOS versions; do not assume titles are byte-identical to Cosense's.
- **The `existsSync` import in `fs-writer.ts`** may end up unused after the refactor (the new code path only uses `readFile` for the existence check). If biome flags it, delete the import and the trailing `void existsSync` line; both are noted in Task 4 Step 3.
- **Cron is enabled in Task 7.** Once the PR merges, the next half-hour boundary triggers a real sync. The Acceptance step recommends a `workflow_dispatch dry_run=true` gate first, but cron will fire regardless if no one trips that. Make sure the secrets are still set (`COSENSE_PROJECT`, `COSENSE_SID`) before merging.

### Deliberate deviations from the spec

- **`Post.blogDir` not added to the IR.** The spec mentions it as a candidate IR field; the plan instead carries `blogDir` on `SyncAction.update` and passes it as a separate parameter to `updatePost`. Cleaner because `Post` is the IR derived from a Cosense page alone — knowing about the local filesystem layout shouldn't be its responsibility.
- **`parseFrontmatter` lives in its own module** (not absorbed into `scripts/sync-cosense.ts` like Phase 1's `UPDATED_AT_RE`). The spec is silent on placement; this layout is unit-testable and reusable, and the orchestrator stays focused on orchestration.
- **`SyncPlan.localCount` renamed to `stubCount`.** The spec drops `MAX_DELETE_RATIO` (which used `localCount`) but doesn't explicitly rename the field. The new name better reflects what it counts in Phase 2's model (blog stubs scanned, not "local posts").
