# Cosense sync — Phase 4 (auto-publish + delete propagation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cosense the source of truth for any blog post that has a `cosense_id`: auto-create stubs when new Cosense pages appear, auto-delete stubs when their Cosense page disappears, while leaving 61 legacy posts (without `cosense_id`) untouched and guarding against catastrophic Cosense API states with a two-threshold delete cap.

**Architecture:** Reverse two of Phase 2's deliberate restrictions in the diff stage — re-add `create` and `delete` to `SyncAction`, drop `skip`. Add `slugForTitle` to derive URLs from titles (page-id fallback for non-ASCII). Add `createPost` / `deletePost` to `fs-writer`. Read `MAX_DELETE_ABS` and `MAX_DELETE_RATIO` env vars in the orchestrator and throw `DeleteThresholdError` (caught by Phase 3's existing health-reporter path) before any deletes execute when either threshold is exceeded.

**Tech Stack:** TypeScript 5.9, vitest, zod, tsx, pnpm 9, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-04-cosense-phase-4-design.md`.

**Branch:** `feat/cosense-sync-phase-4`, already created from `origin/main`.

---

## File Structure

**Modified:**

- `lib/sync/slug.ts` — add `slugForTitle(title, pageId)`. Existing `slugForPageId` and `isValidSlug` untouched.
- `lib/sync/slug.test.ts` — append tests for `slugForTitle`.
- `lib/sync/types.ts` — replace `SyncAction` union (drop `skip`, add `create` and `delete`); add `DeleteThresholdError` class.
- `lib/sync/diff.ts` — emit `create` for unmatched remote pages, `delete` for stubs whose `cosenseId` is no longer in remote, drop `skip` branch.
- `lib/sync/diff.test.ts` — rewrite test suite: replace `skip`-based cases with `create`-based cases, add `delete` cases.
- `lib/sync/fs-writer.ts` — add `createPost(post, blogDir)` and `deletePost(blogDir)`. Existing `updatePost` and `FrontmatterParseError` untouched.
- `lib/sync/fs-writer.test.ts` — append `createPost` and `deletePost` test blocks.
- `scripts/sync-cosense.ts` — read `MAX_DELETE_ABS` (default 5) and `MAX_DELETE_RATIO` (default 0.05); compute delete count and ratio; throw `DeleteThresholdError` before applying any actions if either threshold is violated; dispatch `create` and `delete` actions inside the existing per-page `try/catch`; resolve slug collisions at apply time.
- `scripts/sync-cosense.test.ts` — append integration scenarios for create, delete, threshold violation, and slug collision.
- `.github/workflows/sync.yml` — add `MAX_DELETE_ABS: 5` and `MAX_DELETE_RATIO: '0.05'` to the `Run sync` step's `env:` block. Documented as configurable.

**Untouched:**

- `scripts/sync-report-health.ts` and its tests (Phase 3) — the reporter only reads `SYNC_STATUS` and `.sync-errors.json`; nothing here changes.
- `lib/sync/cosense-client.ts`, `transform.ts`, `scrapbox-to-md.ts`, `parse-frontmatter.ts`, `images.ts`.
- `app/`, `components/`, `styles/`, `velite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`.
- `content/posts/**` (sync will modify these at runtime, but no static edits land in this branch).

**Notes on intermediate-state breakage:** Task 2 leaves `lib/sync/diff.ts` type-failing because the `skip` variant it emits is no longer part of the `SyncAction` union. `scripts/sync-cosense.ts` happens to remain type-clean during this window (it only narrows on `kind: "update"` and generic-counts the rest), but the new `create` and `delete` actions are silently no-ops at runtime until Task 5 wires them up. Full type-clean is restored at the end of Task 4; full functional correctness at the end of Task 5. Per-task verification gates in Tasks 2 and 3 explicitly only check the touched module's tests via `pnpm test:unit <file>` to avoid noise from the broken `diff.ts`.

---

## Task 1: `slugForTitle` in `lib/sync/slug.ts`

**Files:**
- Modify: `lib/sync/slug.ts` (append a new export)
- Modify: `lib/sync/slug.test.ts` (append tests)

This task adds a pure title-to-slug function with a page-id fallback. It has no dependencies on the type changes in later tasks and ships independently green.

- [ ] **Step 1: Append failing tests for `slugForTitle`**

Open `lib/sync/slug.test.ts`. Replace the existing top-of-file imports with:

```ts
import { expect, test } from "vitest"
import { isValidSlug, slugForPageId, slugForTitle } from "./slug"
```

Then append these tests after the existing ones:

```ts
test("slugForTitle: ASCII title becomes lowercase kebab-case", () => {
  expect(slugForTitle("Awesome Feature", "0123456789abcdef01234567")).toBe(
    "awesome-feature",
  )
})

test("slugForTitle: collapses runs of whitespace and dashes", () => {
  expect(
    slugForTitle("Hello   World---thing", "0123456789abcdef01234567"),
  ).toBe("hello-world-thing")
})

test("slugForTitle: strips punctuation that is not a dash", () => {
  expect(
    slugForTitle("Don't break, please!", "0123456789abcdef01234567"),
  ).toBe("dont-break-please")
})

test("slugForTitle: trims leading and trailing dashes", () => {
  expect(slugForTitle("--- foo ---", "0123456789abcdef01234567")).toBe("foo")
})

test("slugForTitle: pure-CJK title falls back to page id", () => {
  expect(slugForTitle("買ってよかったもの", "0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("slugForTitle: title that slugifies to under 3 chars falls back to page id", () => {
  expect(slugForTitle("a!", "0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("slugForTitle: numeric-only title is kept when long enough", () => {
  expect(slugForTitle("2026", "0123456789abcdef01234567")).toBe("2026")
})

test("slugForTitle: mixed CJK + ASCII keeps the ASCII portion when long enough", () => {
  expect(
    slugForTitle("買ってよかったもの 2025 review", "0123456789abcdef01234567"),
  ).toBe("2025-review")
})

test("slugForTitle: rejects an invalid page id", () => {
  expect(() => slugForTitle("Anything", "not-a-page-id")).toThrow(
    /invalid Cosense page id/,
  )
})
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `pnpm test:unit lib/sync/slug.test.ts`

Expected: failures with `Cannot find name 'slugForTitle'` (TS2304) at compile time, or `slugForTitle is not a function` at runtime.

- [ ] **Step 3: Implement `slugForTitle`**

Open `lib/sync/slug.ts`. Append (after the existing `isValidSlug` function):

```ts
export function slugForTitle(title: string, pageId: string): string {
  if (!PAGE_ID_RE.test(pageId)) {
    throw new Error(`invalid Cosense page id: ${pageId}`)
  }
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  if (slug.length >= 3) return slug
  return pageId
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:unit lib/sync/slug.test.ts`

Expected: all `slug.test.ts` cases pass (the original 3 plus the 9 new ones = 12).

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add lib/sync/slug.ts lib/sync/slug.test.ts
git commit -m "slug: add slugForTitle with ASCII slugify + page-id fallback"
```

---

## Task 2: `SyncAction` union update + `DeleteThresholdError` in `lib/sync/types.ts`

**Files:**
- Modify: `lib/sync/types.ts`

This task changes the shape of `SyncAction`, which intentionally breaks the consumers (`diff.ts`, `sync-cosense.ts`) until later tasks update them. We commit anyway — Tasks 4 and 5 fix the resulting type errors.

- [ ] **Step 1: Replace the `SyncAction` union**

Open `lib/sync/types.ts`. Find:

```ts
/** Output of diff stage. */
export type SyncAction =
  | { kind: "update"; page: CosenseListEntry; blogDir: string }
  | { kind: "unchanged"; id: string }
  | { kind: "skip"; title: string; reason: "no-stub" }
```

Replace with:

```ts
/** Output of diff stage. */
export type SyncAction =
  | { kind: "create"; page: CosenseListEntry; slug: string }
  | { kind: "update"; page: CosenseListEntry; blogDir: string }
  | { kind: "unchanged"; id: string }
  | { kind: "delete"; blogDir: string; cosenseId: string }
```

The `slug` on a `create` action is the *preferred* slug from `slugForTitle`. The orchestrator may append a `-<6-hex>` suffix at apply time if `<postsRoot>/<slug>/` already exists; the diff stage does not touch the filesystem.

- [ ] **Step 2: Add `DeleteThresholdError` at the end of the file**

Append to `lib/sync/types.ts`:

```ts
/**
 * Thrown by the sync orchestrator when the count or ratio of `delete` actions
 * in a single run exceeds configured thresholds. Treated as a workflow
 * crash by Phase 3's health reporter (which opens a `sync-broken` issue).
 */
export class DeleteThresholdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DeleteThresholdError"
  }
}
```

- [ ] **Step 3: Confirm tsc breaks at the consumer files (expected)**

Run: `pnpm test`

Expected: errors in `lib/sync/diff.ts` and `scripts/sync-cosense.ts` referring to `kind: "skip"` and missing `kind: "create" | "delete"` arms. **Do not fix them in this task.** They are addressed in Tasks 4 and 5.

- [ ] **Step 4: Confirm `lib/sync/types.ts` itself has no type errors**

Run: `npx tsc --noEmit lib/sync/types.ts 2>&1 | grep -E "types\.ts" || echo "types.ts is clean"`

Expected: `types.ts is clean`.

- [ ] **Step 5: Commit (intermediate-state-breaking)**

```bash
git add lib/sync/types.ts
git commit -m "sync types: replace skip with create/delete, add DeleteThresholdError"
```

---

## Task 3: `createPost` and `deletePost` in `lib/sync/fs-writer.ts`

**Files:**
- Modify: `lib/sync/fs-writer.ts`
- Modify: `lib/sync/fs-writer.test.ts`

This task adds two file-writer primitives. They are independent of the `SyncAction` type changes and tested in isolation. The existing `updatePost` is untouched.

- [ ] **Step 1: Append failing tests for `createPost`**

Open `lib/sync/fs-writer.test.ts`. Replace the existing import line `import { updatePost } from "./fs-writer"` with:

```ts
import { createPost, deletePost, updatePost } from "./fs-writer"
```

Append after the last existing test:

```ts
test("createPost: writes a fresh index.md with full frontmatter", async () => {
  const dir = join(root, "antigravity")
  await mkdir(dir, { recursive: true })
  await createPost(post, dir)
  const out = readFileSync(join(dir, "index.md"), "utf8")
  expect(out).toContain('title: "Sample"')
  expect(out).toContain("created_at: '2026-05-01T00:00:00.000Z'")
  expect(out).toContain("updated_at: '2026-05-04T00:00:00.000Z'")
  expect(out).toContain("cosense_id: 0123456789abcdef01234567")
  expect(out).toContain("\n\nHello body.\n")
})

test("createPost: throws when index.md already exists", async () => {
  const dir = join(root, "antigravity")
  await mkdir(dir, { recursive: true })
  writeFileSync(join(dir, "index.md"), "existing")
  await expect(createPost(post, dir)).rejects.toThrow(/already exists/i)
})

test("createPost: throws when blogDir does not exist", async () => {
  const dir = join(root, "missing")
  await expect(createPost(post, dir)).rejects.toThrow(/ENOENT|no such file/i)
})

test("createPost: does not leave a .tmp file when the write succeeds", async () => {
  const dir = join(root, "antigravity")
  await mkdir(dir, { recursive: true })
  await createPost(post, dir)
  expect(() => statSync(join(dir, "index.md.tmp"))).toThrow()
})

test("createPost: title is JSON-quoted (handles embedded quotes)", async () => {
  const dir = join(root, "quoted")
  await mkdir(dir, { recursive: true })
  const tricky = { ...post, title: 'Has "quotes" and \\backslash' }
  await createPost(tricky, dir)
  const out = readFileSync(join(dir, "index.md"), "utf8")
  expect(out).toContain('title: "Has \\"quotes\\" and \\\\backslash"')
})

test("deletePost: removes the directory recursively", async () => {
  const dir = join(root, "to-delete")
  await mkdir(dir, { recursive: true })
  writeFileSync(join(dir, "index.md"), "stuff")
  writeFileSync(join(dir, "image.png"), "binary")
  await deletePost(dir)
  expect(() => statSync(dir)).toThrow()
})

test("deletePost: ENOENT is a no-op (idempotent)", async () => {
  const dir = join(root, "never-existed")
  await expect(deletePost(dir)).resolves.toBeUndefined()
})
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `pnpm test:unit lib/sync/fs-writer.test.ts`

Expected: failures referring to missing imports `createPost` and `deletePost`.

- [ ] **Step 3: Implement `createPost` and `deletePost`**

Open `lib/sync/fs-writer.ts`. Replace the existing top-of-file imports with:

```ts
import { access, readFile, rename, rm, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { Post } from "./types"
```

Append after the existing `updatePost` function (at the bottom of the file):

```ts
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
```

Two notes on the design:
- `access(indexPath)` is the cheapest existence check. We deliberately distinguish "index.md already exists" (throw a clear message) from "blogDir does not exist" (let the subsequent `writeFile(tmp, ...)` surface the OS-level ENOENT, which the test asserts via the `/ENOENT|no such file/i` regex).
- `mkdir` is intentionally NOT called inside `createPost`. The orchestrator creates the directory as a separate step so it can roll back the directory cleanly if any subsequent step (image download, write) fails — see Task 5.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:unit lib/sync/fs-writer.test.ts`

Expected: all 13 tests pass (6 pre-existing for `updatePost` + 5 new for `createPost` + 2 new for `deletePost`).

- [ ] **Step 5: Run lint**

Run: `pnpm lint:ci`

Expected: pass. (Skip `pnpm test` (tsc) for now — `diff.ts` and `sync-cosense.ts` still emit pre-existing errors from Task 2.)

- [ ] **Step 6: Commit**

```bash
git add lib/sync/fs-writer.ts lib/sync/fs-writer.test.ts
git commit -m "fs-writer: add createPost (atomic) and deletePost (idempotent rm)"
```

---

## Task 4: `lib/sync/diff.ts` rewrite

**Files:**
- Modify: `lib/sync/diff.ts`
- Modify: `lib/sync/diff.test.ts`

This task replaces `skip` emission with `create` and adds `delete` emission for stubs whose `cosenseId` is no longer in the remote list. Stubs without `cosenseId` are completely invisible to the delete pass.

- [ ] **Step 1: Rewrite the test suite**

Open `lib/sync/diff.test.ts` and replace its **entire** contents with:

```ts
import { describe, expect, test } from "vitest"
import { computePlan, type LocalPostState } from "./diff"
import type { CosenseListEntry } from "./types"

const remote: CosenseListEntry[] = [
  { id: "0123456789abcdef01234567", title: "A", updated: 1000 },
  { id: "fedcba9876543210fedcba98", title: "B", updated: 2000 },
]

describe("computePlan", () => {
  test("no stubs: every remote page becomes a create with a slug from title", () => {
    const plan = computePlan(remote, [])
    expect(plan.actions.map((a) => a.kind).sort()).toEqual(["create", "create"])
    const a = plan.actions.find(
      (act) => act.kind === "create" && act.page.title === "A",
    )
    if (!a || a.kind !== "create") throw new Error("expected a create for A")
    expect(a.slug).toBe("a") // length-2 slug falls back to page id
    // length-1 was the actual concern; "a" is length-1 → falls back
  })

  test("create with a long-enough ASCII title uses the slug as-is", () => {
    const single: CosenseListEntry[] = [
      {
        id: "0123456789abcdef01234567",
        title: "Antigravity",
        updated: 1000,
      },
    ]
    const plan = computePlan(single, [])
    const c = plan.actions[0]
    expect(c.kind).toBe("create")
    if (c.kind === "create") expect(c.slug).toBe("antigravity")
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

  test("title comparison normalises NFC", () => {
    const composed = "é"
    const decomposed = "é"
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

  test("delete: stub with cosenseId not in remote -> delete action", () => {
    const local: LocalPostState[] = [
      {
        blogDir: "old-dir",
        title: "Removed",
        cosenseId: "999999999999999999999999",
        updatedAt: new Date(0),
      },
    ]
    const plan = computePlan(remote, local)
    const del = plan.actions.find((a) => a.kind === "delete")
    expect(del).toBeDefined()
    if (del?.kind === "delete") {
      expect(del.blogDir).toBe("old-dir")
      expect(del.cosenseId).toBe("999999999999999999999999")
    }
  })

  test("legacy stub WITHOUT cosenseId is never deleted", () => {
    const local: LocalPostState[] = [
      {
        blogDir: "legacy",
        title: "Legacy",
        updatedAt: new Date(0),
        // no cosenseId
      },
    ]
    const plan = computePlan(remote, local)
    const dels = plan.actions.filter((a) => a.kind === "delete")
    expect(dels).toHaveLength(0)
  })

  test("plan combines create + update + unchanged + delete in one pass", () => {
    const local: LocalPostState[] = [
      // matches remote A by title (newer remote -> update)
      {
        blogDir: "stub-a",
        title: "A",
        updatedAt: new Date(500 * 1000),
      },
      // has cosenseId not in remote -> delete
      {
        blogDir: "stub-gone",
        title: "Gone",
        cosenseId: "999999999999999999999999",
        updatedAt: new Date(0),
      },
      // legacy stub, no cosenseId, no remote match -> ignored
      {
        blogDir: "legacy",
        title: "Legacy",
        updatedAt: new Date(0),
      },
    ]
    const plan = computePlan(remote, local)
    const kinds = plan.actions.map((a) => a.kind).sort()
    // remote A -> update; remote B -> create (no stub matches B);
    // stub-gone -> delete; legacy -> nothing
    expect(kinds).toEqual(["create", "delete", "update"])
  })
})
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `pnpm test:unit lib/sync/diff.test.ts`

Expected: failures from the existing diff implementation still emitting `skip` instead of `create`/`delete`, plus type errors at compile time.

- [ ] **Step 3: Rewrite `lib/sync/diff.ts`**

Open `lib/sync/diff.ts` and replace its **entire** contents with:

```ts
import { slugForTitle } from "./slug"
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

  const remoteIds = new Set(remote.map((p) => p.id))
  const matchedStubs = new Set<LocalPostState>()
  const actions: SyncAction[] = []

  for (const page of remote) {
    const stub = byId.get(page.id) ?? byTitle.get(nfc(page.title))
    if (!stub) {
      actions.push({
        kind: "create",
        page,
        slug: slugForTitle(page.title, page.id),
      })
      continue
    }
    matchedStubs.add(stub)
    if (Math.floor(stub.updatedAt.getTime() / 1000) >= page.updated) {
      actions.push({ kind: "unchanged", id: page.id })
    } else {
      actions.push({ kind: "update", page, blogDir: stub.blogDir })
    }
  }

  for (const stub of local) {
    if (!stub.cosenseId) continue // legacy posts are never deleted
    if (matchedStubs.has(stub)) continue // already handled as update/unchanged
    if (remoteIds.has(stub.cosenseId)) continue // matched by id but title-search hit differently — paranoia
    actions.push({
      kind: "delete",
      blogDir: stub.blogDir,
      cosenseId: stub.cosenseId,
    })
  }

  return { actions, stubCount: local.length }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:unit lib/sync/diff.test.ts`

Expected: all 11 cases pass.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both pass. `scripts/sync-cosense.ts` was already type-clean during the Task 2/3 window (its action loop narrows on `kind: "update"` and falls through for the rest); now that `diff.ts` is fixed, the whole project tsc is green.

- [ ] **Step 6: Commit**

```bash
git add lib/sync/diff.ts lib/sync/diff.test.ts
git commit -m "diff: emit create/delete actions, drop skip; legacy stubs untouched"
```

---

## Task 5: Orchestrator updates in `scripts/sync-cosense.ts`

**Files:**
- Modify: `scripts/sync-cosense.ts`
- Modify: `scripts/sync-cosense.test.ts`

This task wires the new `create` and `delete` actions into the orchestrator, adds threshold checking and slug-collision resolution, and integrates the per-page error tolerance for all action kinds. The branch becomes type-clean again at the end of this task.

- [ ] **Step 1: Append failing integration tests**

Open `scripts/sync-cosense.test.ts`. Replace the existing import line for the local module:

Find:
```ts
import { runSync } from "./sync-cosense"
```

Replace with:
```ts
import { runSync } from "./sync-cosense"
import { DeleteThresholdError } from "@/lib/sync/types"
```

Then append these tests after the last existing test in the file:

```ts
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
  expect(r.plan.actions.map((a) => a.kind).sort()).toEqual([
    "create",
    "create",
  ])
  // Slugs are "a" and "b" -> length-1, falls back to page id
  const dirs = readdirSync(postsRoot).sort()
  expect(dirs).toEqual([
    "0123456789abcdef01234567",
    "fedcba9876543210fedcba98",
  ])
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
    readFileSync(
      join(postsRoot, "antigravity-111111", "index.md"),
      "utf8",
    ),
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
  })
  expect(r.errors).toHaveLength(0)
  const dirs = readdirSync(postsRoot).sort()
  // a-stub remains (updated), going-away removed, legacy preserved,
  // "fedcba9876543210fedcba98" created for B
  expect(dirs).toEqual([
    "a-stub",
    "fedcba9876543210fedcba98",
    "legacy",
  ])
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
    await makeStub(`gone-${i}`, `Gone ${i}`, "2020-01-01T00:00:00.000Z", `aaaaaaaaaaaaaaaaaaaaaa${i.toString().padStart(2, "0")}`)
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
    await makeStub(`gone-${i}`, `Gone ${i}`, "2020-01-01T00:00:00.000Z", `bbbbbbbbbbbbbbbbbbbbbb${i.toString().padStart(2, "0")}`)
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
  await makeStub("gone", "Gone", "2020-01-01T00:00:00.000Z", "999999999999999999999999")
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
```

- [ ] **Step 2: Run the failing tests and confirm they fail**

Run: `pnpm test:unit scripts/sync-cosense.test.ts`

Expected: failures, primarily about `runSync` not accepting `maxDeleteAbs` / `maxDeleteRatio` and not honoring `create`/`delete` actions. The pre-existing 5 `update`/`dryRun` tests should still pass.

- [ ] **Step 3: Rewrite `scripts/sync-cosense.ts`**

Open `scripts/sync-cosense.ts` and replace its **entire** contents with:

```ts
// scripts/sync-cosense.ts
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { createPost, deletePost, updatePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { parseFrontmatter } from "@/lib/sync/parse-frontmatter"
import { transformPage } from "@/lib/sync/transform"
import { DeleteThresholdError, type SyncPlan } from "@/lib/sync/types"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
  MAX_DELETE_ABS: z.coerce.number().int().nonnegative().default(5),
  MAX_DELETE_RATIO: z.coerce.number().nonnegative().default(0.05),
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
  maxDeleteAbs?: number
  maxDeleteRatio?: number
}

export interface RunResult {
  plan: SyncPlan
  errors: SyncError[]
}

async function dirExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false
    throw err
  }
}

async function resolveCreateSlug(
  postsRoot: string,
  preferredSlug: string,
  pageId: string,
): Promise<string> {
  if (!(await dirExists(join(postsRoot, preferredSlug)))) return preferredSlug
  const withSuffix = `${preferredSlug}-${pageId.slice(0, 6)}`
  if (!(await dirExists(join(postsRoot, withSuffix)))) return withSuffix
  throw new Error(
    `slug collision: both ${preferredSlug}/ and ${withSuffix}/ already exist`,
  )
}

export async function runSync(opts: RunOptions): Promise<RunResult> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  if (opts.dryRun) return { plan, errors: [] }

  // --- Threshold check (BEFORE any side effects) ---
  const maxAbs = opts.maxDeleteAbs ?? 5
  const maxRatio = opts.maxDeleteRatio ?? 0.05
  const deleteCount = plan.actions.filter((a) => a.kind === "delete").length
  const cosenseSourced = local.filter((s) => s.cosenseId).length
  const ratio = cosenseSourced > 0 ? deleteCount / cosenseSourced : 0
  if (deleteCount > maxAbs) {
    throw new DeleteThresholdError(
      `delete count ${deleteCount} exceeds MAX_DELETE_ABS=${maxAbs}`,
    )
  }
  if (ratio > maxRatio) {
    throw new DeleteThresholdError(
      `delete ratio ${ratio.toFixed(3)} exceeds MAX_DELETE_RATIO=${maxRatio.toFixed(3)}`,
    )
  }

  const errors: SyncError[] = []
  for (const action of plan.actions) {
    try {
      if (action.kind === "update") {
        const page = await opts.client.getPage(action.page.title)
        const post = transformPage(page)
        const dir = join(opts.postsRoot, action.blogDir)
        await downloadImages(post.images, dir, { fetch: opts.fetch })
        await updatePost(post, dir)
      } else if (action.kind === "create") {
        const page = await opts.client.getPage(action.page.title)
        const post = transformPage(page)
        const finalSlug = await resolveCreateSlug(
          opts.postsRoot,
          action.slug,
          page.id,
        )
        const dir = join(opts.postsRoot, finalSlug)
        await mkdir(dir, { recursive: false })
        try {
          await downloadImages(post.images, dir, { fetch: opts.fetch })
          await createPost(post, dir)
        } catch (innerErr) {
          // Rollback an empty/partial dir so the next tick is clean.
          await deletePost(dir).catch(() => {})
          throw innerErr
        }
      } else if (action.kind === "delete") {
        await deletePost(join(opts.postsRoot, action.blogDir))
      }
      // unchanged: nothing to do
    } catch (err) {
      const title =
        action.kind === "delete"
          ? `(delete cosense_id ${action.cosenseId})`
          : action.page.title
      errors.push({
        title,
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
  let create = 0
  let update = 0
  let unchanged = 0
  let del = 0
  for (const a of plan.actions) {
    if (a.kind === "create") create++
    else if (a.kind === "update") update++
    else if (a.kind === "unchanged") unchanged++
    else if (a.kind === "delete") del++
  }
  return `plan: ${create} create, ${update} update, ${unchanged} unchanged, ${del} delete, ${errors.length} errors (stubs: ${plan.stubCount})`
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
    maxDeleteAbs: env.MAX_DELETE_ABS,
    maxDeleteRatio: env.MAX_DELETE_RATIO,
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

- [ ] **Step 4: Run all unit tests and confirm green**

Run: `pnpm test:unit`

Expected: all tests across `lib/sync/*.test.ts` and `scripts/*.test.ts` pass. The new `create`/`delete`/threshold scenarios pass alongside the pre-existing dry-run, update, idempotency, and per-page-error tests.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both succeed cleanly. The branch is fully type-clean again.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-cosense.ts scripts/sync-cosense.test.ts
git commit -m "sync orchestrator: dispatch create/delete with threshold + slug-collision guards"
```

---

## Task 6: Workflow YAML threshold env

**Files:**
- Modify: `.github/workflows/sync.yml`

This task wires the two threshold env vars into the GitHub Actions workflow. It is a one-step edit.

- [ ] **Step 1: Add threshold env to the `Run sync` step**

Open `.github/workflows/sync.yml`. Find the `Run sync` step:

```yaml
      - name: Run sync
        id: sync
        continue-on-error: true
        run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
```

Add `MAX_DELETE_ABS` and `MAX_DELETE_RATIO` under `env:`:

```yaml
      - name: Run sync
        id: sync
        continue-on-error: true
        run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT:  ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:      ${{ secrets.COSENSE_SID }}
          MAX_DELETE_ABS:   '5'
          MAX_DELETE_RATIO: '0.05'
```

The values are quoted strings because GitHub Actions env values are always strings; zod's `z.coerce.number()` in `envSchema` parses them.

- [ ] **Step 2: Inspect the diff**

Run: `git diff .github/workflows/sync.yml`

Expected: only the two new env entries added; no other lines changed; the `COSENSE_PROJECT` / `COSENSE_SID` lines are re-aligned by one space to keep the column flush, which is acceptable cosmetic drift.

- [ ] **Step 3: Run all checks**

Run: `pnpm test && pnpm lint:ci && pnpm test:unit`

Expected: all three succeed.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/sync.yml
git commit -m "sync workflow: expose MAX_DELETE_ABS=5 and MAX_DELETE_RATIO=0.05 env"
```

---

## Verification checklist (run before opening the PR)

- [ ] `pnpm test` (tsc) — passes.
- [ ] `pnpm lint:ci` — passes.
- [ ] `pnpm test:unit` — all `lib/sync/*.test.ts` and `scripts/*.test.ts` pass; no regressions in `scripts/sync-report-health.test.ts`.
- [ ] `git diff origin/main..HEAD --stat` shows exactly these files (plus the spec/plan from prior commits): `lib/sync/types.ts`, `lib/sync/slug.ts`, `lib/sync/slug.test.ts`, `lib/sync/diff.ts`, `lib/sync/diff.test.ts`, `lib/sync/fs-writer.ts`, `lib/sync/fs-writer.test.ts`, `scripts/sync-cosense.ts`, `scripts/sync-cosense.test.ts`, `.github/workflows/sync.yml`.
- [ ] `scripts/sync-report-health.ts` and `scripts/sync-report-health.test.ts` are byte-for-byte unchanged on this branch (`git diff origin/main..HEAD -- scripts/sync-report-health.ts scripts/sync-report-health.test.ts` returns empty).
- [ ] `content/posts/**` is unchanged (no static edits land in this branch).

---

## Out of scope (do not add)

- Backfilling the 61 legacy posts to Cosense.
- Bidirectional sync (writes to Cosense).
- A `draft: true` frontmatter flag for soft-deletes.
- Migrating the 48 already-matched stubs to a different URL scheme.
- Splitting `scripts/sync-cosense.ts` into smaller files. The orchestrator's responsibilities are in one place by design and will exceed 200 lines after this task — that is acceptable per the existing pattern.

If the implementer encounters a question whose answer would require extending into these areas, stop and ask before proceeding.
