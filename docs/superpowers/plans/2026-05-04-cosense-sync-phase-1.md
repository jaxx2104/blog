# Cosense sync — Phase 1 (sync infrastructure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the one-way Cosense → repo sync engine end-to-end, runnable manually via `pnpm sync` and via `gh workflow run sync.yml`. No cron, no migration, no production data — Phase 2 takes care of those.

**Architecture:** A thin orchestrator (`scripts/sync-cosense.ts`) drives a fan of pure / single-responsibility modules under `lib/sync/`. The IR (intermediate representation) defined in `lib/sync/types.ts` is the only stable contract: Cosense client returns IR, markdown emitter consumes IR. Everything that can be a pure function is one — fixtures and unit tests live next to the source.

**Tech Stack:** TypeScript 5.9, vitest (new), zod (new), tsx (existing), pnpm 9, GitHub Actions, Cosense REST API.

**Spec:** `docs/superpowers/specs/2026-05-04-cosense-source-of-truth-design.md` (Phase 1 only).

**Branch:** `docs/cosense-source-of-truth-spec` is already checked out and carries the spec commit. Create the implementation branch from `origin/main` per CLAUDE.md (`git fetch -p origin && git switch -c feat/cosense-sync-phase-1 origin/main`); cherry-pick `701e2c4` so the spec rides along, or merge from the docs branch when both are PR-ready.

---

## File Structure

**Created:**

- `vitest.config.ts` — minimal vitest config rooted at the repo, picks up `lib/**/*.test.ts`.
- `lib/sync/types.ts` — IR types + small zod schemas for API boundaries.
- `lib/sync/scrapbox-to-md.ts` — pure `(string) => string` notation translator.
- `lib/sync/scrapbox-to-md.test.ts` — table tests, one row per supported notation.
- `lib/sync/cosense-client.ts` — REST wrapper, returns parsed IR-friendly shapes.
- `lib/sync/cosense-client.test.ts` — contract tests against captured fixtures.
- `lib/sync/__fixtures__/pages-list.json` — captured `/api/pages/<project>` response.
- `lib/sync/__fixtures__/page-detail.json` — captured `/api/pages/<project>/<title>` response.
- `lib/sync/transform.ts` — Cosense page object → IR `Post`.
- `lib/sync/transform.test.ts` — covers metadata extraction (tags, description).
- `lib/sync/frontmatter.ts` — IR → YAML frontmatter string.
- `lib/sync/frontmatter.test.ts` — round-trip + key ordering.
- `lib/sync/slug.ts` — page id → slug helpers.
- `lib/sync/slug.test.ts` — collision and shape checks.
- `lib/sync/images.ts` — download Gyazo / scrapbox.io images to a target directory.
- `lib/sync/images.test.ts` — uses a stubbed `fetch` to verify path layout, idempotency.
- `lib/sync/fs-writer.ts` — idempotent writer for `content/posts/<id>/`.
- `lib/sync/fs-writer.test.ts` — second run is byte-identical and a no-op.
- `lib/sync/redirects.ts` — `(seed[]) => string` emitter; empty seed → empty output.
- `lib/sync/redirects.test.ts` — empty seed, single entry, collision detection.
- `lib/sync/diff.ts` — given remote pages + local dirs, classify new / updated / deleted.
- `lib/sync/diff.test.ts` — exhaustive small cases.
- `scripts/sync-cosense.ts` — orchestrator CLI (no transform logic).
- `scripts/sync-cosense.test.ts` — integration test using stubbed client + tmp dir.
- `.github/workflows/sync.yml` — `workflow_dispatch` only in Phase 1; cron added in Phase 2.

**Modified:**

- `package.json` — add `vitest`, `zod` deps; add `sync`, `test:unit` scripts.
- `pnpm-lock.yaml` — generated.
- `.github/workflows/test.yml` — add a `pnpm test:unit` step after the existing `pnpm test`.
- `tsconfig.json` — add `vitest.config.ts` to `include`.

**Untouched:** `app/`, `components/`, `styles/`, `velite.config.ts`, `vite.config.mts`, every existing file under `lib/` outside `lib/sync/`.

---

## Task 1: Test infrastructure (vitest + zod)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `tsconfig.json`
- Create: `lib/sync/__smoke__.test.ts` (deleted at end of task)

- [ ] **Step 1: Add dev deps and scripts**

```bash
pnpm add -D vitest@^2.1.0
pnpm add zod@^3.23.8
```

Then edit `package.json` `scripts` block — add two entries, leave `test` (= tsc) alone:

```json
    "sync": "tsx scripts/sync-cosense.ts",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    reporters: "default",
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, ""),
    },
  },
})
```

- [ ] **Step 3: Add `vitest.config.ts` to tsconfig include**

Edit `tsconfig.json` `include`, add `"vitest.config.ts"` between `"styles/**/*.tsx"` and `"vite.config.mts"`. Do not touch `exclude`.

- [ ] **Step 4: Write a smoke test**

Create `lib/sync/__smoke__.test.ts`:

```ts
import { expect, test } from "vitest"

test("vitest can run a trivial assertion", () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 5: Verify the smoke test passes**

Run: `pnpm test:unit`
Expected output ends with `Test Files  1 passed (1)` / `Tests  1 passed (1)`.

Also run: `pnpm test` — must still pass (existing tsc gate).

- [ ] **Step 6: Delete the smoke file and commit**

```bash
rm lib/sync/__smoke__.test.ts
git add package.json pnpm-lock.yaml vitest.config.ts tsconfig.json
git commit -m "Add vitest + zod for the Cosense sync engine"
```

---

## Task 2: IR types (`lib/sync/types.ts`)

**Files:**
- Create: `lib/sync/types.ts`

The IR is the only stable contract between sync stages. Keep it intentionally narrow — fields the markdown emitter and frontmatter emitter actually consume.

- [ ] **Step 1: Write the file**

```ts
// lib/sync/types.ts
import { z } from "zod"

/** Cosense page object as returned by /api/pages/<project>/<title>. */
export const cosensePageSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  title: z.string().min(1),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  lines: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      userId: z.string(),
      created: z.number().int(),
      updated: z.number().int(),
    }),
  ),
})
export type CosensePage = z.infer<typeof cosensePageSchema>

/** Cosense list entry as returned by /api/pages/<project>. */
export const cosenseListEntrySchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  title: z.string().min(1),
  updated: z.number().int().nonnegative(),
})
export type CosenseListEntry = z.infer<typeof cosenseListEntrySchema>

export const cosenseListResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  pages: z.array(cosenseListEntrySchema),
})

/** Internal Representation of a single blog post. */
export interface Post {
  id: string                 // Cosense page id, also the directory name + URL slug
  title: string
  createdAt: Date
  updatedAt: Date
  description: string        // first non-empty body line, trimmed
  tags: string[]
  body: string               // markdown body without frontmatter
  images: ImageRef[]         // images referenced by body, downloaded by sync
}

export interface ImageRef {
  /** URL on Cosense / Gyazo / scrapbox.io. */
  url: string
  /** Filename used inside the post directory (also referenced by body). */
  filename: string
}

/** Output of diff stage. */
export type SyncAction =
  | { kind: "create"; page: CosenseListEntry }
  | { kind: "update"; page: CosenseListEntry }
  | { kind: "delete"; id: string }
  | { kind: "unchanged"; id: string }

export interface SyncPlan {
  actions: SyncAction[]
  /** Number of currently existing local post directories before sync. */
  localCount: number
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm test`
Expected: PASS (tsc).

- [ ] **Step 3: Commit**

```bash
git add lib/sync/types.ts
git commit -m "Add IR types for Cosense sync"
```

---

## Task 3: Scrapbox → markdown (TDD core)

**Files:**
- Create: `lib/sync/scrapbox-to-md.test.ts`
- Create: `lib/sync/scrapbox-to-md.ts`

This is the highest-bug-surface module in the project. We TDD it notation by notation. Keep the function pure and string-in-string-out.

- [ ] **Step 1: Write the failing notation table**

Create `lib/sync/scrapbox-to-md.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { scrapboxToMarkdown } from "./scrapbox-to-md"

describe("scrapboxToMarkdown", () => {
  const cases: Array<[label: string, input: string, expected: string]> = [
    ["plain line",     "hello world",                    "hello world"],
    ["bold via [* ]",  "[* very important]",              "**very important**"],
    ["heading h3 [** ]", "[** medium]",                   "### medium"],
    ["heading h2 [*** ]", "[*** big]",                    "## big"],
    ["heading h1 [**** ]", "[**** huge]",                 "# huge"],
    ["inline code",    "use `pnpm sync` daily",           "use `pnpm sync` daily"],
    ["external url",   "[https://example.com Example]",   "[Example](https://example.com)"],
    ["bare url",       "[https://example.com]",           "<https://example.com>"],
    ["hashtag stays inline", "see #blog for more",        "see #blog for more"],
    ["gyazo image",    "[https://gyazo.com/abc123]",      "![](abc123.png)"],
    ["scrapbox image", "[https://scrapbox.io/files/xyz.png]", "![](xyz.png)"],
    ["internal link",  "[Other Page]",                    "**Other Page**"],
    ["blockquote",     "> quoted",                         "> quoted"],
    ["heading clamps 5+ stars to h1", "[***** mega]",     "# mega"],
    ["whitespace-only bracket stays as-is", "[   ]",      "[   ]"],
    ["bare url with trailing period", "[https://example.com.]", "<https://example.com>."],
  ]
  for (const [label, input, expected] of cases) {
    test(label, () => {
      expect(scrapboxToMarkdown(input)).toBe(expected)
    })
  }

  test("multi-line body keeps order and blank lines", () => {
    const input = "[**** Title]\n\nIntro paragraph\n\n[* note]"
    expect(scrapboxToMarkdown(input)).toBe(
      "# Title\n\nIntro paragraph\n\n**note**",
    )
  })

  test("fenced code block: 'code:filename.ts' followed by indented lines", () => {
    const input = "code:hello.ts\n const x = 1\n const y = 2"
    expect(scrapboxToMarkdown(input)).toBe(
      "```ts\nconst x = 1\nconst y = 2\n```",
    )
  })
})
```

- [ ] **Step 2: Run the test, confirm red**

Run: `pnpm test:unit lib/sync/scrapbox-to-md.test.ts`
Expected: FAIL with `Cannot find module './scrapbox-to-md'`.

- [ ] **Step 3: Implement the translator**

Create `lib/sync/scrapbox-to-md.ts`:

```ts
// lib/sync/scrapbox-to-md.ts
//
// Pure (string) => string translator. Handles only the notation that
// the test table covers. New notation discovered in real Cosense
// content adds a row to the table FIRST, then is implemented here.

const HEADING_LEVELS: Record<2 | 3 | 4, string> = { 4: "#", 3: "##", 2: "###" }

const GYAZO_RE = /^\[https:\/\/gyazo\.com\/([a-zA-Z0-9]+)(?:\.[a-z]+)?\]$/
const SCRAPBOX_FILE_RE =
  /^\[https:\/\/scrapbox\.io\/files\/([a-zA-Z0-9]+\.[a-z]+)\]$/
const URL_TITLE_RE = /^\[(https?:\/\/\S+)\s+(.+)\]$/
const URL_BARE_RE = /^\[(https?:\/\/[^\s\]]+?)([.,;:!?]?)\]$/
const STAR_RE = /^\[(\*+)\s+(.+)\]$/
const INTERNAL_RE = /^\[([^\]]+)\]$/
const CODE_OPEN_RE = /^code:([^\s]+)$/

function transformInline(line: string): string {
  // Whole-line wrappers handled first.
  let m: RegExpMatchArray | null
  if ((m = line.match(GYAZO_RE))) return `![](${m[1]}.png)`
  if ((m = line.match(SCRAPBOX_FILE_RE))) return `![](${m[1]})`
  if ((m = line.match(URL_TITLE_RE))) return `[${m[2]}](${m[1]})`
  if ((m = line.match(URL_BARE_RE))) return `<${m[1]}>${m[2]}`
  if ((m = line.match(STAR_RE))) {
    const stars = m[1].length
    const text = m[2]
    return stars === 1 ? `**${text}**` : `${HEADING_LEVELS[stars as 2 | 3 | 4] ?? "#"} ${text}`
  }
  if ((m = line.match(INTERNAL_RE)) && !m[1].startsWith("http")) {
    const content = m[1]
    if (content.length > 0 && !/^\s/.test(content) && content.trim().length > 0) {
      return `**${content}**`
    }
  }
  return line
}

export function scrapboxToMarkdown(input: string): string {
  const lines = input.split("\n")
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    const codeOpen = raw.match(CODE_OPEN_RE)
    if (codeOpen) {
      const filename = codeOpen[1]
      const ext = filename.includes(".") ? filename.split(".").pop()! : ""
      const code: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith(" ")) {
        code.push(lines[i].slice(1))
        i++
      }
      out.push("```" + ext)
      out.push(...code)
      out.push("```")
      continue
    }
    out.push(transformInline(raw))
    i++
  }
  return out.join("\n")
}
```

- [ ] **Step 4: Run the test, confirm green**

Run: `pnpm test:unit lib/sync/scrapbox-to-md.test.ts`
Expected: all rows pass.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/scrapbox-to-md.ts lib/sync/scrapbox-to-md.test.ts
git commit -m "Add Scrapbox notation -> markdown translator with table tests"
```

---

## Task 4: Frontmatter emitter (`lib/sync/frontmatter.ts`)

**Files:**
- Create: `lib/sync/frontmatter.test.ts`
- Create: `lib/sync/frontmatter.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/frontmatter.test.ts
import { expect, test } from "vitest"
import { emitFrontmatter } from "./frontmatter"
import type { Post } from "./types"

const post: Post = {
  id: "0123456789abcdef01234567",
  title: "Sample Post",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-04T12:34:56.000Z"),
  description: "First line of the body, trimmed.",
  tags: ["sample", "demo"],
  body: "ignored by frontmatter emitter",
  images: [],
}

test("emits keys in a stable order", () => {
  expect(emitFrontmatter(post)).toBe(
    [
      "---",
      "title: 'Sample Post'",
      "created_at: '2026-05-01T00:00:00.000Z'",
      "updated_at: '2026-05-04T12:34:56.000Z'",
      "path: /0123456789abcdef01234567",
      "description: 'First line of the body, trimmed.'",
      "tags:",
      "  - sample",
      "  - demo",
      "---",
      "",
    ].join("\n"),
  )
})

test("omits tags entirely when empty", () => {
  const out = emitFrontmatter({ ...post, tags: [] })
  expect(out).not.toContain("tags:")
})

test("escapes single quotes in title", () => {
  const out = emitFrontmatter({ ...post, title: "Don't break" })
  expect(out).toContain("title: \"Don't break\"")
})

test("rejects scalars with embedded newlines", () => {
  expect(() =>
    emitFrontmatter({ ...post, description: "first\nsecond" }),
  ).toThrow(/newline/)
})

test("escapes backslash before quote in mixed-quote case", () => {
  const out = emitFrontmatter({ ...post, title: "It's \\n literal" })
  // Title quoted with double quotes; backslash doubled, then \n preserved.
  expect(out).toContain(`title: "It's \\\\n literal"`)
})
```

- [ ] **Step 2: Run, confirm red**

Run: `pnpm test:unit lib/sync/frontmatter.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the emitter**

```ts
import type { Post } from "./types"

function quoteScalar(s: string): string {
  if (/[\n\r]/.test(s)) {
    throw new Error(`frontmatter scalar must not contain newlines: ${JSON.stringify(s)}`)
  }
  // YAML: single-quote unless the value itself contains a single quote.
  // In that case use double quotes and escape backslashes (first) and
  // double quotes (second). Order matters — if we escaped " before \,
  // the inserted backslashes would get doubled too.
  if (s.includes("'")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }
  return `'${s}'`
}

export function emitFrontmatter(post: Post): string {
  const lines: string[] = ["---"]
  lines.push(`title: ${quoteScalar(post.title)}`)
  lines.push(`created_at: '${post.createdAt.toISOString()}'`)
  lines.push(`updated_at: '${post.updatedAt.toISOString()}'`)
  lines.push(`path: /${post.id}`)
  lines.push(`description: ${quoteScalar(post.description)}`)
  if (post.tags.length > 0) {
    lines.push("tags:")
    for (const tag of post.tags) lines.push(`  - ${tag}`)
  }
  lines.push("---", "")
  return lines.join("\n")
}
```

- [ ] **Step 4: Run, confirm green**

Run: `pnpm test:unit lib/sync/frontmatter.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/frontmatter.ts lib/sync/frontmatter.test.ts
git commit -m "Add YAML frontmatter emitter for sync output"
```

---

## Task 5: Slug helper (`lib/sync/slug.ts`)

**Files:**
- Create: `lib/sync/slug.test.ts`
- Create: `lib/sync/slug.ts`

Trivial today (page id IS the slug) but isolated so future schemes can swap in here.

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/slug.test.ts
import { expect, test } from "vitest"
import { isValidSlug, slugForPageId } from "./slug"

test("page id passes through verbatim", () => {
  expect(slugForPageId("0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("rejects non-id input", () => {
  expect(isValidSlug("Not An Id")).toBe(false)
  expect(isValidSlug("0123456789abcdef01234567")).toBe(true)
})
```

- [ ] **Step 2: Implement and verify**

```ts
// lib/sync/slug.ts
const PAGE_ID_RE = /^[a-f0-9]{24}$/

export function slugForPageId(pageId: string): string {
  if (!PAGE_ID_RE.test(pageId)) {
    throw new Error(`invalid Cosense page id: ${pageId}`)
  }
  return pageId
}

export function isValidSlug(s: string): boolean {
  return PAGE_ID_RE.test(s)
}
```

Run: `pnpm test:unit lib/sync/slug.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/slug.ts lib/sync/slug.test.ts
git commit -m "Add slug helper (page id passthrough, validated)"
```

---

## Task 6: Cosense client + fixtures (contract test)

**Files:**
- Create: `lib/sync/__fixtures__/pages-list.json` (hand-shaped or captured)
- Create: `lib/sync/__fixtures__/page-detail.json`
- Create: `lib/sync/cosense-client.test.ts`
- Create: `lib/sync/cosense-client.ts`

The client never depends on a live Cosense in tests. Fixtures are real responses captured once and committed.

- [ ] **Step 1: Create fixtures**

`lib/sync/__fixtures__/pages-list.json`:

```json
{
  "count": 2,
  "pages": [
    {
      "id": "0123456789abcdef01234567",
      "title": "First Post",
      "created": 1714521600,
      "updated": 1714694400
    },
    {
      "id": "fedcba9876543210fedcba98",
      "title": "Second Post",
      "created": 1714521600,
      "updated": 1714694400
    }
  ]
}
```

`lib/sync/__fixtures__/page-detail.json`:

```json
{
  "id": "0123456789abcdef01234567",
  "title": "First Post",
  "created": 1714521600,
  "updated": 1714694400,
  "lines": [
    { "id": "l1", "text": "First Post",  "userId": "u1", "created": 1714521600, "updated": 1714521600 },
    { "id": "l2", "text": "Intro line.", "userId": "u1", "created": 1714521600, "updated": 1714521600 },
    { "id": "l3", "text": "[* highlight]","userId": "u1", "created": 1714521600, "updated": 1714521600 }
  ]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// lib/sync/cosense-client.test.ts
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test, vi } from "vitest"
import {
  cosenseListResponseSchema,
  cosensePageSchema,
} from "./types"
import { CosenseClient } from "./cosense-client"

const listJson = JSON.parse(
  readFileSync(resolve(__dirname, "__fixtures__/pages-list.json"), "utf8"),
)
const detailJson = JSON.parse(
  readFileSync(resolve(__dirname, "__fixtures__/page-detail.json"), "utf8"),
)

describe("schemas accept captured fixtures", () => {
  test("list response", () => {
    expect(() => cosenseListResponseSchema.parse(listJson)).not.toThrow()
  })
  test("page detail", () => {
    expect(() => cosensePageSchema.parse(detailJson)).not.toThrow()
  })
})

describe("CosenseClient", () => {
  test("listPages hits /api/pages/<project> and parses response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(listJson), { status: 200 }),
    )
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    const result = await c.listPages()
    expect(result.pages).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scrapbox.io/api/pages/demo?limit=1000&skip=0",
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "connect.sid=s" }),
      }),
    )
  })

  test("getPage URL-encodes the title", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(detailJson), { status: 200 }),
    )
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    await c.getPage("Hello World")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scrapbox.io/api/pages/demo/Hello%20World",
      expect.any(Object),
    )
  })

  test("non-2xx throws", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("x", { status: 503 }))
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    await expect(c.listPages()).rejects.toThrow(/503/)
  })
})
```

Run: `pnpm test:unit lib/sync/cosense-client.test.ts` → red, module not found.

- [ ] **Step 3: Implement the client**

```ts
// lib/sync/cosense-client.ts
import {
  type CosensePage,
  cosenseListResponseSchema,
  cosensePageSchema,
} from "./types"

export interface CosenseClientOptions {
  project: string
  sid: string
  fetch?: typeof globalThis.fetch
}

const BASE = "https://scrapbox.io/api/pages"

export class CosenseClient {
  private readonly project: string
  private readonly sid: string
  private readonly fetcher: typeof globalThis.fetch

  constructor(opts: CosenseClientOptions) {
    this.project = opts.project
    this.sid = opts.sid
    this.fetcher = opts.fetch ?? globalThis.fetch
  }

  private headers(): HeadersInit {
    return { Cookie: `connect.sid=${this.sid}` }
  }

  async listPages() {
    const url = `${BASE}/${encodeURIComponent(this.project)}?limit=1000&skip=0`
    const r = await this.fetcher(url, { headers: this.headers() })
    if (!r.ok) throw new Error(`Cosense list failed: ${r.status}`)
    return cosenseListResponseSchema.parse(await r.json())
  }

  async getPage(title: string): Promise<CosensePage> {
    const url = `${BASE}/${encodeURIComponent(this.project)}/${encodeURIComponent(title)}`
    const r = await this.fetcher(url, { headers: this.headers() })
    if (!r.ok) throw new Error(`Cosense getPage failed: ${r.status}`)
    return cosensePageSchema.parse(await r.json())
  }
}
```

Run: `pnpm test:unit lib/sync/cosense-client.test.ts` → green.

- [ ] **Step 4: Commit**

```bash
git add lib/sync/cosense-client.ts lib/sync/cosense-client.test.ts \
        lib/sync/__fixtures__/pages-list.json lib/sync/__fixtures__/page-detail.json
git commit -m "Add Cosense REST client with fixture-driven contract tests"
```

---

## Task 7: Page → IR transform (`lib/sync/transform.ts`)

**Files:**
- Create: `lib/sync/transform.test.ts`
- Create: `lib/sync/transform.ts`

This module: drops the title line (Cosense pages always start with the title as line 0), extracts hashtags and image refs from the body, derives `description`, and returns an IR `Post`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/transform.test.ts
import { expect, test } from "vitest"
import { transformPage } from "./transform"
import type { CosensePage } from "./types"

const page: CosensePage = {
  id: "0123456789abcdef01234567",
  title: "First Post",
  created: 1714521600,
  updated: 1714694400,
  lines: [
    { id: "l1", text: "First Post",                           userId: "u", created: 1, updated: 1 },
    { id: "l2", text: "Intro paragraph.",                     userId: "u", created: 1, updated: 1 },
    { id: "l3", text: "Body line with #blog #demo tags",      userId: "u", created: 1, updated: 1 },
    { id: "l4", text: "[https://gyazo.com/ABCDEF123456.png]", userId: "u", created: 1, updated: 1 },
  ],
}

test("strips title line and emits IR", () => {
  const post = transformPage(page)
  expect(post.id).toBe("0123456789abcdef01234567")
  expect(post.title).toBe("First Post")
  expect(post.createdAt.toISOString()).toBe(new Date(1714521600 * 1000).toISOString())
  expect(post.description).toBe("Intro paragraph.")
  expect(post.tags).toEqual(["blog", "demo"])
  expect(post.body).toContain("Intro paragraph.")
  expect(post.body).not.toContain("First Post\n")
  expect(post.images).toEqual([
    { url: "https://gyazo.com/ABCDEF123456.png", filename: "ABCDEF123456.png" },
  ])
})

test("description falls back to empty string when body has no prose", () => {
  const post = transformPage({ ...page, lines: [page.lines[0]] })
  expect(post.description).toBe("")
})
```

Run: `pnpm test:unit lib/sync/transform.test.ts` → red.

- [ ] **Step 2: Implement**

```ts
// lib/sync/transform.ts
import { scrapboxToMarkdown } from "./scrapbox-to-md"
import type { CosensePage, ImageRef, Post } from "./types"

const HASHTAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu
const GYAZO_RE = /\[https:\/\/gyazo\.com\/([a-zA-Z0-9]+)(\.[a-z]+)?\]/g
const SCRAPBOX_FILE_RE = /\[https:\/\/scrapbox\.io\/files\/([a-zA-Z0-9]+\.[a-z]+)\]/g

function extractTags(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(HASHTAG_RE)) out.add(m[1])
  return [...out]
}

function extractImages(text: string): ImageRef[] {
  const out: ImageRef[] = []
  for (const m of text.matchAll(GYAZO_RE)) {
    const ext = m[2] ?? ".png"
    out.push({ url: `https://gyazo.com/${m[1]}${ext}`, filename: `${m[1]}${ext}` })
  }
  for (const m of text.matchAll(SCRAPBOX_FILE_RE)) {
    out.push({
      url: `https://scrapbox.io/files/${m[1]}`,
      filename: m[1],
    })
  }
  return out
}

function firstProseLine(bodyLines: string[]): string {
  for (const l of bodyLines) {
    const trimmed = l.trim()
    if (trimmed.length === 0) continue
    if (trimmed.startsWith("#")) continue          // hashtag-only line
    if (trimmed.startsWith("[")) continue          // image / heading line
    return trimmed.length > 160 ? trimmed.slice(0, 160) : trimmed
  }
  return ""
}

export function transformPage(page: CosensePage): Post {
  const bodyLines = page.lines.slice(1).map((l) => l.text)
  const rawBody = bodyLines.join("\n")
  return {
    id: page.id,
    title: page.title,
    createdAt: new Date(page.created * 1000),
    updatedAt: new Date(page.updated * 1000),
    description: firstProseLine(bodyLines),
    tags: extractTags(rawBody),
    body: scrapboxToMarkdown(rawBody),
    images: extractImages(rawBody),
  }
}
```

Run: `pnpm test:unit lib/sync/transform.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/transform.ts lib/sync/transform.test.ts
git commit -m "Add Cosense page -> IR transform"
```

---

## Task 8: Image downloader (`lib/sync/images.ts`)

**Files:**
- Create: `lib/sync/images.test.ts`
- Create: `lib/sync/images.ts`

Idempotent: if the file already exists with matching size, do not refetch. Errors are surfaced (caller decides to skip the page).

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/images.test.ts
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { downloadImages } from "./images"

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "sync-img-")) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

test("downloads each image once", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
  )
  await downloadImages(
    [
      { url: "https://gyazo.com/a.png", filename: "a.png" },
      { url: "https://gyazo.com/b.png", filename: "b.png" },
    ],
    dir,
    { fetch: fetchMock },
  )
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(readFileSync(join(dir, "a.png"))).toEqual(new Uint8Array([1, 2, 3]))
  expect(readFileSync(join(dir, "b.png"))).toEqual(new Uint8Array([1, 2, 3]))
})

test("skips files that already exist", async () => {
  writeFileSync(join(dir, "a.png"), new Uint8Array([9]))
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([1]), { status: 200 }),
  )
  await downloadImages(
    [{ url: "https://gyazo.com/a.png", filename: "a.png" }],
    dir,
    { fetch: fetchMock },
  )
  expect(fetchMock).not.toHaveBeenCalled()
  expect(statSync(join(dir, "a.png")).size).toBe(1)
})

test("propagates fetch failure", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }))
  await expect(
    downloadImages(
      [{ url: "https://gyazo.com/a.png", filename: "a.png" }],
      dir,
      { fetch: fetchMock },
    ),
  ).rejects.toThrow(/404/)
})
```

Run: `pnpm test:unit lib/sync/images.test.ts` → red.

- [ ] **Step 2: Implement**

```ts
// lib/sync/images.ts
import { existsSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { ImageRef } from "./types"

export interface DownloadOptions {
  fetch?: typeof globalThis.fetch
}

export async function downloadImages(
  refs: ImageRef[],
  targetDir: string,
  opts: DownloadOptions = {},
): Promise<void> {
  const fetcher = opts.fetch ?? globalThis.fetch
  for (const ref of refs) {
    const dest = join(targetDir, ref.filename)
    if (existsSync(dest)) continue
    const r = await fetcher(ref.url)
    if (!r.ok) throw new Error(`image fetch ${ref.url} -> ${r.status}`)
    const buf = new Uint8Array(await r.arrayBuffer())
    await writeFile(dest, buf)
  }
}
```

Run: `pnpm test:unit lib/sync/images.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/images.ts lib/sync/images.test.ts
git commit -m "Add idempotent image downloader for Cosense images"
```

---

## Task 9: Idempotent fs writer (`lib/sync/fs-writer.ts`)

**Files:**
- Create: `lib/sync/fs-writer.test.ts`
- Create: `lib/sync/fs-writer.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/fs-writer.test.ts
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test } from "vitest"
import { writePost, deletePost } from "./fs-writer"
import type { Post } from "./types"

let root: string
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "sync-fs-")) })
afterEach(() => { rmSync(root, { recursive: true, force: true }) })

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
  expect(out).toContain("title: Sample")
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
  writeFileSync(join(root, "to-delete.md"), "x") // noise: stays
  await writePost(post, root)
  await deletePost(post.id, root)
  expect(() => statSync(join(root, post.id))).toThrow()
  expect(readFileSync(join(root, "to-delete.md"), "utf8")).toBe("x")
})
```

Run: `pnpm test:unit lib/sync/fs-writer.test.ts` → red.

- [ ] **Step 2: Implement**

```ts
// lib/sync/fs-writer.ts
import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
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
  await writeFile(dest, next)
}

export async function deletePost(id: string, postsRoot: string): Promise<void> {
  const dir = join(postsRoot, id)
  if (!existsSync(dir)) return
  await rm(dir, { recursive: true, force: true })
}
```

Run: `pnpm test:unit lib/sync/fs-writer.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/fs-writer.ts lib/sync/fs-writer.test.ts
git commit -m "Add idempotent post writer + deletePost"
```

---

## Task 10: Redirects emitter (`lib/sync/redirects.ts`)

**Files:**
- Create: `lib/sync/redirects.test.ts`
- Create: `lib/sync/redirects.ts`

The seed file lives in Phase 2; this module accepts the parsed seed array and emits the body of `public/_redirects`. Empty seed → empty string (caller skips file write).

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/redirects.test.ts
import { describe, expect, test } from "vitest"
import { emitRedirects, type RedirectSeedEntry } from "./redirects"

describe("emitRedirects", () => {
  test("empty seed -> empty string", () => {
    expect(emitRedirects([])).toBe("")
  })

  test("emits one 308 line per entry", () => {
    const seed: RedirectSeedEntry[] = [
      { old_path: "/2025-purchases", new_id: "0123456789abcdef01234567" },
      { old_path: "/php-replace-lf", new_id: "fedcba9876543210fedcba98" },
    ]
    expect(emitRedirects(seed)).toBe(
      [
        "/2025-purchases /0123456789abcdef01234567/ 308",
        "/php-replace-lf /fedcba9876543210fedcba98/ 308",
        "",
      ].join("\n"),
    )
  })

  test("throws on duplicate old_path", () => {
    expect(() =>
      emitRedirects([
        { old_path: "/x", new_id: "0123456789abcdef01234567" },
        { old_path: "/x", new_id: "fedcba9876543210fedcba98" },
      ]),
    ).toThrow(/duplicate/i)
  })
})
```

Run: `pnpm test:unit lib/sync/redirects.test.ts` → red.

- [ ] **Step 2: Implement**

```ts
// lib/sync/redirects.ts
export interface RedirectSeedEntry {
  old_path: string
  new_id: string
}

export function emitRedirects(seed: RedirectSeedEntry[]): string {
  if (seed.length === 0) return ""
  const seen = new Set<string>()
  const lines: string[] = []
  for (const entry of seed) {
    if (seen.has(entry.old_path)) {
      throw new Error(`duplicate old_path in redirects seed: ${entry.old_path}`)
    }
    seen.add(entry.old_path)
    lines.push(`${entry.old_path} /${entry.new_id}/ 308`)
  }
  lines.push("")
  return lines.join("\n")
}
```

Run: `pnpm test:unit lib/sync/redirects.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/redirects.ts lib/sync/redirects.test.ts
git commit -m "Add Cloudflare _redirects emitter (308 with empty-seed handling)"
```

---

## Task 11: Diff classifier (`lib/sync/diff.ts`)

**Files:**
- Create: `lib/sync/diff.test.ts`
- Create: `lib/sync/diff.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/sync/diff.test.ts
import { describe, expect, test } from "vitest"
import { computePlan, type LocalPostState } from "./diff"
import type { CosenseListEntry } from "./types"

const remote: CosenseListEntry[] = [
  { id: "0123456789abcdef01234567", title: "A", updated: 1000 },
  { id: "fedcba9876543210fedcba98", title: "B", updated: 2000 },
]

describe("computePlan", () => {
  test("empty local -> all create", () => {
    const plan = computePlan(remote, [])
    expect(plan.actions.map((a) => a.kind).sort()).toEqual(["create", "create"])
    expect(plan.localCount).toBe(0)
  })

  test("local matches remote with same updated -> unchanged", () => {
    const local: LocalPostState[] = [
      { id: "0123456789abcdef01234567", updatedAt: new Date(1000 * 1000) },
      { id: "fedcba9876543210fedcba98", updatedAt: new Date(2000 * 1000) },
    ]
    const plan = computePlan(remote, local)
    expect(plan.actions.every((a) => a.kind === "unchanged")).toBe(true)
  })

  test("remote.updated newer -> update", () => {
    const local: LocalPostState[] = [
      { id: "0123456789abcdef01234567", updatedAt: new Date(500 * 1000) },
      { id: "fedcba9876543210fedcba98", updatedAt: new Date(2000 * 1000) },
    ]
    const plan = computePlan(remote, local)
    const update = plan.actions.find((a) => a.kind === "update")
    expect(update).toBeDefined()
    if (update?.kind === "update") expect(update.page.id).toBe("0123456789abcdef01234567")
  })

  test("local entry not in remote -> delete", () => {
    const local: LocalPostState[] = [
      { id: "0123456789abcdef01234567", updatedAt: new Date(1000 * 1000) },
      { id: "ffffffffffffffffffffffff", updatedAt: new Date(0) },
    ]
    const plan = computePlan(remote, local)
    expect(plan.actions.find((a) => a.kind === "delete")).toEqual({
      kind: "delete",
      id: "ffffffffffffffffffffffff",
    })
  })
})
```

Run: `pnpm test:unit lib/sync/diff.test.ts` → red.

- [ ] **Step 2: Implement**

```ts
// lib/sync/diff.ts
import type { CosenseListEntry, SyncAction, SyncPlan } from "./types"

export interface LocalPostState {
  id: string
  updatedAt: Date
}

export function computePlan(
  remote: CosenseListEntry[],
  local: LocalPostState[],
): SyncPlan {
  const actions: SyncAction[] = []
  const localById = new Map(local.map((l) => [l.id, l]))
  for (const page of remote) {
    const cur = localById.get(page.id)
    if (!cur) {
      actions.push({ kind: "create", page })
    } else if (Math.floor(cur.updatedAt.getTime() / 1000) < page.updated) {
      actions.push({ kind: "update", page })
    } else {
      actions.push({ kind: "unchanged", id: page.id })
    }
    localById.delete(page.id)
  }
  for (const stale of localById.keys()) {
    actions.push({ kind: "delete", id: stale })
  }
  return { actions, localCount: local.length }
}
```

Run: `pnpm test:unit lib/sync/diff.test.ts` → green.

- [ ] **Step 3: Commit**

```bash
git add lib/sync/diff.ts lib/sync/diff.test.ts
git commit -m "Add diff classifier (create/update/unchanged/delete)"
```

---

## Task 12: Orchestrator + CLI (`scripts/sync-cosense.ts`)

**Files:**
- Create: `scripts/sync-cosense.ts`

Reads env, flags, the local state, calls the client, runs diff, executes per-page work, writes redirects, prints a summary. Stays under ~120 lines.

- [ ] **Step 1: Implement (no TDD here — task 13 is the integration test)**

```ts
// scripts/sync-cosense.ts
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import matter from "gray-matter"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { writePost, deletePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { emitRedirects, type RedirectSeedEntry } from "@/lib/sync/redirects"
import { transformPage } from "@/lib/sync/transform"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
  MAX_DELETE_RATIO: z.coerce.number().min(0).max(1).default(0.5),
})

const POSTS_ROOT = resolve(process.cwd(), "content/posts")
const REDIRECTS_PATH = resolve(process.cwd(), "public/_redirects")
const SEED_PATH = resolve(process.cwd(), "lib/sync/redirects-seed.json")

interface Args { dryRun: boolean }
function parseArgs(argv: string[]): Args {
  return { dryRun: argv.includes("--dry-run") || process.env.SYNC_DRY_RUN === "true" }
}

async function readLocalState(): Promise<LocalPostState[]> {
  let entries: string[]
  try { entries = await readdir(POSTS_ROOT) } catch { return [] }
  const out: LocalPostState[] = []
  for (const id of entries) {
    if (!/^[a-f0-9]{24}$/.test(id)) continue
    const front = matter(await readFile(join(POSTS_ROOT, id, "index.md"), "utf8")).data
    if (typeof front.updated_at !== "string") continue
    out.push({ id, updatedAt: new Date(front.updated_at) })
  }
  return out
}

async function readSeed(): Promise<RedirectSeedEntry[]> {
  try { return JSON.parse(await readFile(SEED_PATH, "utf8")) } catch { return [] }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)

  const client = new CosenseClient({ project: env.COSENSE_PROJECT, sid: env.COSENSE_SID })
  const list = await client.listPages()
  const local = await readLocalState()
  const plan = computePlan(list.pages, local)

  const deletions = plan.actions.filter((a) => a.kind === "delete").length
  if (plan.localCount > 0 && deletions / plan.localCount > env.MAX_DELETE_RATIO) {
    throw new Error(`abort: would delete ${deletions}/${plan.localCount} posts`)
  }

  console.log(`plan: ${plan.actions.map((a) => a.kind).join(",")}`)

  if (args.dryRun) {
    await writeFile(
      resolve(process.cwd(), ".sync-plan.json"),
      JSON.stringify(plan, null, 2),
    )
    return
  }

  for (const action of plan.actions) {
    if (action.kind === "delete") {
      await deletePost(action.id, POSTS_ROOT)
      continue
    }
    if (action.kind === "unchanged") continue
    const page = await client.getPage(action.page.title)
    const post = transformPage(page)
    await downloadImages(post.images, join(POSTS_ROOT, post.id))
    await writePost(post, POSTS_ROOT)
  }

  const redirects = emitRedirects(await readSeed())
  if (redirects.length > 0) await writeFile(REDIRECTS_PATH, redirects)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm test`
Expected: PASS (tsc).

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-cosense.ts
git commit -m "Add sync orchestrator (CLI entry point)"
```

---

## Task 13: Orchestrator integration test (`scripts/sync-cosense.test.ts`)

**Files:**
- Create: `scripts/sync-cosense.test.ts`

We test the orchestrator end-to-end against a stubbed client + tmp dir, NOT by spawning a subprocess. To do this we extract the orchestration body into a runnable function.

- [ ] **Step 1: Refactor `scripts/sync-cosense.ts` to export a `runSync()` function**

Restructure so the file ends like this (replacing the previous `main` + `.catch` block):

```ts
export interface RunOptions {
  client: { listPages: CosenseClient["listPages"]; getPage: CosenseClient["getPage"] }
  postsRoot: string
  redirectsPath: string
  seed: RedirectSeedEntry[]
  maxDeleteRatio: number
  dryRun: boolean
  fetch?: typeof globalThis.fetch
}

export async function runSync(opts: RunOptions): Promise<{ plan: ReturnType<typeof computePlan> }> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  const deletions = plan.actions.filter((a) => a.kind === "delete").length
  if (plan.localCount > 0 && deletions / plan.localCount > opts.maxDeleteRatio) {
    throw new Error(`abort: would delete ${deletions}/${plan.localCount} posts`)
  }

  if (opts.dryRun) return { plan }

  for (const action of plan.actions) {
    if (action.kind === "delete") {
      await deletePost(action.id, opts.postsRoot)
      continue
    }
    if (action.kind === "unchanged") continue
    const page = await opts.client.getPage(action.page.title)
    const post = transformPage(page)
    const postDir = join(opts.postsRoot, post.id)
    await mkdir(postDir, { recursive: true })
    await downloadImages(post.images, postDir, { fetch: opts.fetch })
    await writePost(post, opts.postsRoot)
  }

  const redirects = emitRedirects(opts.seed)
  if (redirects.length > 0) await writeFile(opts.redirectsPath, redirects)
  return { plan }
}

async function readLocalStateAt(postsRoot: string): Promise<LocalPostState[]> {
  let entries: string[]
  try { entries = await readdir(postsRoot) } catch { return [] }
  const out: LocalPostState[] = []
  for (const id of entries) {
    if (!/^[a-f0-9]{24}$/.test(id)) continue
    const front = matter(await readFile(join(postsRoot, id, "index.md"), "utf8")).data
    if (typeof front.updated_at !== "string") continue
    out.push({ id, updatedAt: new Date(front.updated_at) })
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)
  const seed = await readSeed()
  await runSync({
    client: new CosenseClient({ project: env.COSENSE_PROJECT, sid: env.COSENSE_SID }),
    postsRoot: POSTS_ROOT,
    redirectsPath: REDIRECTS_PATH,
    seed,
    maxDeleteRatio: env.MAX_DELETE_RATIO,
    dryRun: args.dryRun,
  }).catch((err) => { console.error(err); process.exit(1) })
}
```

Add `mkdir` to the existing `node:fs/promises` import. Remove the previous `main()` definition and its `.catch` handler.

- [ ] **Step 2: Write the integration test**

```ts
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
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "sync-int-")) })
afterEach(() => { rmSync(root, { recursive: true, force: true }) })

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

test("real run creates post directories and is idempotent", async () => {
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

  // second run is a no-op
  c.getPage.mockClear()
  await runSync({
    client: stubClient(),
    postsRoot: join(root, "posts"),
    redirectsPath: join(root, "_redirects"),
    seed: [],
    maxDeleteRatio: 0.5,
    dryRun: false,
    fetch: fetchStub,
  })
  // both pages now appear unchanged based on frontmatter updated_at
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
  // Stub returns the canned listJson which doesn't contain either local id,
  // so both will be classified as delete. 2/2 = 1.0 > 0.5 → abort.
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
```

- [ ] **Step 3: Run, then fix any small refactor issues**

Run: `pnpm test:unit scripts/sync-cosense.test.ts`
Expected: green. If a test fails because the orchestrator imports `gray-matter` (already a project dep, see `package.json`), that's expected to work — it's used elsewhere in the build.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-cosense.ts scripts/sync-cosense.test.ts
git commit -m "Make sync orchestrator testable; add integration tests"
```

---

## Task 14: GitHub Actions workflow (manual only in Phase 1)

**Files:**
- Create: `.github/workflows/sync.yml`
- Modify: `.github/workflows/test.yml`

The cron schedule is intentionally left out of Phase 1. Phase 2 enables it after migration data is in place.

- [ ] **Step 1: Create `sync.yml`**

```yaml
name: Sync from Cosense
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry-run only (writes .sync-plan.json, no commit)"
        required: false
        default: "false"

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
        run: pnpm sync ${{ inputs.dry_run == 'true' && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
      - name: Commit & push (skipped on dry-run)
        if: inputs.dry_run != 'true'
        run: |
          if [ -n "$(git status --porcelain content public)" ]; then
            git config user.name  "blog-sync[bot]"
            git config user.email "blog-sync@users.noreply.github.com"
            git add content public
            git commit -m "sync: pull from Cosense"
            git push origin main
          fi
      - name: Upload dry-run plan
        if: inputs.dry_run == 'true' && hashFiles('.sync-plan.json') != ''
        uses: actions/upload-artifact@v4
        with:
          name: sync-plan
          path: .sync-plan.json
```

- [ ] **Step 2: Add a vitest step to `test.yml`**

In `.github/workflows/test.yml`, after the existing `- run: pnpm test` line and BEFORE the "Verify dist artifacts" step, insert:

```yaml
      - run: pnpm test:unit
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync.yml .github/workflows/test.yml
git commit -m "Add manual Cosense sync workflow + wire vitest into CI"
```

---

## Task 15: Acceptance check

**Files:** none modified.

- [ ] **Step 1: Lint and full test sweep**

```bash
pnpm lint:ci
pnpm test
pnpm test:unit
```

All three must pass. If `lint:ci` complains, run `pnpm lint` and re-stage.

- [ ] **Step 2: Local dry-run against a real test Cosense project**

This is the Phase 1 acceptance gate from the spec. The author creates a small test Cosense project (any name, any 1–3 pages) and exports `COSENSE_PROJECT` / `COSENSE_SID` locally.

```bash
export COSENSE_PROJECT=...
export COSENSE_SID=...
pnpm sync --dry-run
cat .sync-plan.json
```

Expected: `.sync-plan.json` lists one `create` per Cosense page, `localCount: 0`. No files under `content/posts/` are touched.

- [ ] **Step 3: PR**

Open a PR from this branch to `main`. Title: `feat: Cosense source-of-truth — Phase 1 sync engine`. Body: link the spec, summarize that no live data is changed (workflow is `workflow_dispatch` only, cron is Phase 2). Mention that secrets `COSENSE_PROJECT` and `COSENSE_SID` need to be added to the GitHub repo settings before the workflow can be exercised end-to-end.

- [ ] **Step 4: After merge**

Verify in the GitHub Actions UI that "Sync from Cosense" appears under workflows and can be triggered via "Run workflow" with `dry_run: true`. The artifact `sync-plan` should be downloadable and contain the same JSON shape as the local dry-run.

---

## Self-review notes (for the implementer)

- The orchestrator imports `gray-matter` — that's an existing dep used by Velite's content layer, so it's safe to use.
- `import.meta.url === \`file://${process.argv[1]}\`` is the standard "is this script run directly under tsx?" idiom; if it doesn't trigger when run via `pnpm sync`, fall back to gating with `process.env.NODE_ENV !== "test"` and call `runSync(...)` from the script body unconditionally outside tests.
- The integration test in Task 13 stubs the client object directly rather than spawning a subprocess. Do not be tempted to spawn `tsx scripts/sync-cosense.ts` — it adds 2-3 s per test for no signal gain.
- If the Scrapbox notation table grows past ~15 rows, split the table tests into thematic `describe` blocks but keep the data-driven structure.
- `lib/sync/redirects-seed.json` is intentionally absent from this plan. Phase 2 creates it.

### Deliberate deviations from the spec

- **Per-page error tolerance is deferred.** The spec describes a `.sync-errors.json` file and a "skip page, continue" policy for parse / image / schema failures. Phase 1's orchestrator throws on the first per-page failure, which aborts the whole run. This is acceptable while the workflow is `workflow_dispatch` only (operator sees the failure immediately and re-runs). Phase 2 must add the per-page tolerance before the cron is enabled, otherwise a single broken page will block all subsequent syncs.
- **Pre-write `postSchema` validation is not implemented.** Phase 1 relies on the existing `pnpm build` (run by Cloudflare Pages or in CI) to catch schema drift. This is fine because Phase 1 doesn't run sync against `main` automatically.
- **Cron schedule is not enabled.** `sync.yml` ships with `workflow_dispatch:` only. Phase 2 adds `schedule:` after migration data lands.
