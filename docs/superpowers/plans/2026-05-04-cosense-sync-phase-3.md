# Cosense sync — Phase 3 (operational hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-sync reporter that maintains a single `sync-broken`-labelled GitHub Issue reflecting current Cosense sync health: open or comment on it when sync fails (workflow crash or per-page errors), close it on the first clean run.

**Architecture:** A new TypeScript script `scripts/sync-report-health.ts` runs after the existing sync step in `.github/workflows/sync.yml`. It is split into a pure decision function (`decideAction`) and an I/O shell that reads `.sync-errors.json` and the previous step's `outcome`, then dispatches via the `gh` CLI behind an injectable `runGh` interface for testability.

**Tech Stack:** TypeScript 5.9, vitest, zod, tsx, pnpm 9, GitHub Actions, GitHub CLI (`gh`).

**Spec:** `docs/superpowers/specs/2026-05-04-cosense-phase-3-design.md`.

**Branch:** `feat/cosense-sync-phase-3`, already created from `origin/main`.

---

## File Structure

**Created:**

- `scripts/sync-report-health.ts` — single TypeScript file holding (a) types `SyncStatus`, `SyncError`, `ActionKind`, `FailureType`; (b) pure `decideAction` and `deriveFailureType` functions; (c) pure body formatters `formatNewIssue`, `formatBrokenComment`, `formatRecoveredComment`; (d) I/O helpers `readErrorsFile`, `findExistingIssue`; (e) orchestrator `reportHealth(opts)`; (f) default `runGh` implementation using `node:child_process` `execFile`; (g) entrypoint guard reading env via zod and calling `reportHealth`.
- `scripts/sync-report-health.test.ts` — vitest unit tests covering every row of the decision matrix, the formatter cap behavior, and `reportHealth` integration with a stubbed `runGh`.

**Modified:**

- `.github/workflows/sync.yml` — give the sync step `id: sync` and `continue-on-error: true`; add `permissions: issues: write` alongside the existing `contents: write`; add a post-sync `Report sync health` step (always-runs except on dry-run); add a final `Fail job if sync failed` step so the workflow's overall status still reflects the underlying sync outcome.
- `package.json` — add `"sync:report-health": "tsx scripts/sync-report-health.ts"`.

**Untouched (must not be modified by this plan):**

- `lib/sync/**` — Phase 3 reads sync output, never internals.
- `scripts/sync-cosense.ts`, `scripts/sync-cosense.test.ts` — orchestrator unchanged.
- `content/posts/**`.
- `app/`, `components/`, `styles/`, `velite.config.ts`, `tsconfig.json`, `vitest.config.ts`.

**Manual precondition (Task 5):**

- A `sync-broken` label must exist on the GitHub repo before the workflow runs. Created once via `gh label create`.

---

## Task 1: Pure `decideAction` function

**Files:**
- Create: `scripts/sync-report-health.ts`
- Create: `scripts/sync-report-health.test.ts`

This task ships the pure decision logic only. The file will compile and tests will pass without importing anything other than node built-ins, so the rest of the plan can build on top.

- [ ] **Step 1: Scaffold the source file with types and a stub function**

Create `scripts/sync-report-health.ts` with exactly this content:

```ts
// scripts/sync-report-health.ts

export type SyncStatus = "success" | "failure"

export interface SyncError {
  title: string
  error: string
}

export type ActionKind =
  | "noop"
  | "create"
  | "comment-broken"
  | "comment-recovered-and-close"

export function decideAction(
  status: SyncStatus,
  errors: SyncError[],
  existing: { number: number } | null,
): ActionKind {
  throw new Error("not implemented")
}
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/sync-report-health.test.ts` with exactly this content:

```ts
// scripts/sync-report-health.test.ts
import { describe, expect, test } from "vitest"
import { decideAction, type SyncError } from "./sync-report-health"

const ERR: SyncError[] = [{ title: "A", error: "boom" }]
const EXISTING = { number: 42 }

describe("decideAction", () => {
  test("success + no errors + no existing issue → noop", () => {
    expect(decideAction("success", [], null)).toBe("noop")
  })

  test("success + no errors + existing issue → comment-recovered-and-close", () => {
    expect(decideAction("success", [], EXISTING)).toBe(
      "comment-recovered-and-close",
    )
  })

  test("success + per-page errors + no existing → create", () => {
    expect(decideAction("success", ERR, null)).toBe("create")
  })

  test("success + per-page errors + existing → comment-broken", () => {
    expect(decideAction("success", ERR, EXISTING)).toBe("comment-broken")
  })

  test("failure + no errors + no existing → create", () => {
    expect(decideAction("failure", [], null)).toBe("create")
  })

  test("failure + no errors + existing → comment-broken", () => {
    expect(decideAction("failure", [], EXISTING)).toBe("comment-broken")
  })

  test("failure + per-page errors + no existing → create", () => {
    expect(decideAction("failure", ERR, null)).toBe("create")
  })

  test("failure + per-page errors + existing → comment-broken", () => {
    expect(decideAction("failure", ERR, EXISTING)).toBe("comment-broken")
  })
})
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: 8 failures, all with `Error: not implemented`.

- [ ] **Step 4: Implement `decideAction`**

Replace the body of `decideAction` in `scripts/sync-report-health.ts` with:

```ts
export function decideAction(
  status: SyncStatus,
  errors: SyncError[],
  existing: { number: number } | null,
): ActionKind {
  const broken = status !== "success" || errors.length > 0
  if (broken) return existing ? "comment-broken" : "create"
  return existing ? "comment-recovered-and-close" : "noop"
}
```

- [ ] **Step 5: Run the test and confirm all 8 cases pass**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: 8 passed.

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both succeed with no errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-report-health.ts scripts/sync-report-health.test.ts
git commit -m "sync-report-health: pure decideAction over status × errors × existing"
```

---

## Task 2: Pure body formatters

**Files:**
- Modify: `scripts/sync-report-health.ts` (append exports)
- Modify: `scripts/sync-report-health.test.ts` (append `describe` blocks)

This task adds the three pure body-formatter functions plus `deriveFailureType`. All are pure: input → string. No I/O.

- [ ] **Step 1: Append failing tests for `deriveFailureType`**

Append to `scripts/sync-report-health.test.ts` (after the existing `describe("decideAction", ...)`):

```ts
import {
  deriveFailureType,
  formatBrokenComment,
  formatNewIssue,
  formatRecoveredComment,
} from "./sync-report-health"

describe("deriveFailureType", () => {
  test("status=failure, no errors → workflow-crash", () => {
    expect(deriveFailureType("failure", [])).toBe("workflow-crash")
  })

  test("status=success, has errors → partial-failure", () => {
    expect(deriveFailureType("success", ERR)).toBe("partial-failure")
  })

  test("status=failure, has errors → both", () => {
    expect(deriveFailureType("failure", ERR)).toBe("both")
  })
})
```

Replace the top-of-file imports (currently a single `import { describe, expect, test } from "vitest"`) with these two imports so the new symbols resolve:

```ts
import { describe, expect, test } from "vitest"
import {
  decideAction,
  deriveFailureType,
  formatBrokenComment,
  formatNewIssue,
  formatRecoveredComment,
  type SyncError,
} from "./sync-report-health"
```

- [ ] **Step 2: Append failing tests for the formatters**

Append to `scripts/sync-report-health.test.ts`:

```ts
const RUN_URL =
  "https://github.com/jaxx2104/blog/actions/runs/123456789"

describe("formatNewIssue", () => {
  test("title is the constant '[sync] failing'", () => {
    const { title } = formatNewIssue({
      runUrl: RUN_URL,
      status: "failure",
      errors: [],
    })
    expect(title).toBe("[sync] failing")
  })

  test("body links the run URL and names the failure type", () => {
    const { body } = formatNewIssue({
      runUrl: RUN_URL,
      status: "failure",
      errors: [],
    })
    expect(body).toContain(RUN_URL)
    expect(body).toContain("Status: workflow-crash")
    expect(body).toContain("Per-page errors: 0")
  })

  test("body includes a per-page error list when errors are present", () => {
    const { body } = formatNewIssue({
      runUrl: RUN_URL,
      status: "success",
      errors: [
        { title: "Page A", error: "boom" },
        { title: "Page B", error: "kaboom" },
      ],
    })
    expect(body).toContain("Status: partial-failure")
    expect(body).toContain("Per-page errors: 2")
    expect(body).toContain("- Page A — boom")
    expect(body).toContain("- Page B — kaboom")
  })

  test("body caps the error list at 20 entries with a footer", () => {
    const errors: SyncError[] = Array.from({ length: 25 }, (_, i) => ({
      title: `Page ${i + 1}`,
      error: "x",
    }))
    const { body } = formatNewIssue({
      runUrl: RUN_URL,
      status: "success",
      errors,
    })
    expect(body).toContain("- Page 20 — x")
    expect(body).not.toContain("- Page 21 — x")
    expect(body).toContain("... and 5 more")
  })
})

describe("formatBrokenComment", () => {
  test("opens with 'Still failing as of <run-url>'", () => {
    const out = formatBrokenComment({
      runUrl: RUN_URL,
      status: "failure",
      errors: [],
    })
    expect(out.startsWith(`Still failing as of ${RUN_URL}.`)).toBe(true)
  })

  test("includes failure type and error count", () => {
    const out = formatBrokenComment({
      runUrl: RUN_URL,
      status: "failure",
      errors: ERR,
    })
    expect(out).toContain("Status: both")
    expect(out).toContain("Per-page errors: 1")
  })
})

describe("formatRecoveredComment", () => {
  test("is a fixed one-liner naming the run URL", () => {
    expect(formatRecoveredComment(RUN_URL)).toBe(
      `Recovered at ${RUN_URL}. Closing.`,
    )
  })
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: failures with `Cannot find name 'deriveFailureType'` (and the other three) at type-check time, or runtime `is not a function`.

- [ ] **Step 4: Implement the formatters**

Append to `scripts/sync-report-health.ts`:

```ts
export type FailureType = "workflow-crash" | "partial-failure" | "both"

export function deriveFailureType(
  status: SyncStatus,
  errors: SyncError[],
): FailureType {
  if (status === "failure" && errors.length === 0) return "workflow-crash"
  if (status === "success" && errors.length > 0) return "partial-failure"
  return "both"
}

const ERROR_LIST_CAP = 20

function formatErrorList(errors: SyncError[]): string {
  const top = errors.slice(0, ERROR_LIST_CAP)
  const lines = top.map((e) => `- ${e.title} — ${e.error}`)
  const more = errors.length - top.length
  if (more > 0) lines.push(`- ... and ${more} more`)
  return lines.join("\n")
}

function errorBlock(errors: SyncError[]): string[] {
  if (errors.length === 0) return []
  const shown = Math.min(errors.length, ERROR_LIST_CAP)
  return [
    "",
    "<details>",
    `<summary>Per-page errors (top ${shown} of ${errors.length})</summary>`,
    "",
    formatErrorList(errors),
    "</details>",
  ]
}

export interface FailingArgs {
  runUrl: string
  status: SyncStatus
  errors: SyncError[]
}

export function formatNewIssue(args: FailingArgs): {
  title: string
  body: string
} {
  const failureType = deriveFailureType(args.status, args.errors)
  const lines = [
    "Sync from Cosense is currently failing.",
    "",
    `- Run: ${args.runUrl}`,
    `- Status: ${failureType}`,
    `- Per-page errors: ${args.errors.length}`,
    ...errorBlock(args.errors),
    "",
    "This issue is managed automatically by `scripts/sync-report-health.ts` and will close itself on the next clean run.",
  ]
  return { title: "[sync] failing", body: lines.join("\n") }
}

export function formatBrokenComment(args: FailingArgs): string {
  const failureType = deriveFailureType(args.status, args.errors)
  return [
    `Still failing as of ${args.runUrl}.`,
    "",
    `- Status: ${failureType}`,
    `- Per-page errors: ${args.errors.length}`,
    ...errorBlock(args.errors),
  ].join("\n")
}

export function formatRecoveredComment(runUrl: string): string {
  return `Recovered at ${runUrl}. Closing.`
}
```

- [ ] **Step 5: Run the tests and confirm everything passes**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: all tests in all four `describe` blocks pass (the original 8 from Task 1 plus the new ones).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add scripts/sync-report-health.ts scripts/sync-report-health.test.ts
git commit -m "sync-report-health: pure body formatters with 20-error cap"
```

---

## Task 3: I/O shell (`readErrorsFile`, `findExistingIssue`, `reportHealth`)

**Files:**
- Modify: `scripts/sync-report-health.ts` (append exports + entrypoint)
- Modify: `scripts/sync-report-health.test.ts` (append `describe` blocks)

This task wires the pure pieces together behind an injectable `GhRunner` interface. Tests do not invoke the real `gh` CLI — they pass a `vi.fn()` and assert it was called with the expected argv and stdin.

- [ ] **Step 1: Append failing tests for `readErrorsFile`**

First, augment the imports at the top of `scripts/sync-report-health.test.ts` to also include the new symbols (replace the existing import block):

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  decideAction,
  deriveFailureType,
  findExistingIssue,
  formatBrokenComment,
  formatNewIssue,
  formatRecoveredComment,
  type GhRunner,
  readErrorsFile,
  reportHealth,
  type SyncError,
} from "./sync-report-health"
```

Then append:

```ts
describe("readErrorsFile", () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sync-rh-"))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test("returns [] when the file is missing", async () => {
    expect(await readErrorsFile(join(dir, "missing.json"))).toEqual([])
  })

  test("returns [] when the file is empty", async () => {
    const p = join(dir, "empty.json")
    writeFileSync(p, "")
    expect(await readErrorsFile(p)).toEqual([])
  })

  test("returns the parsed errors when the file is valid JSON", async () => {
    const p = join(dir, "errors.json")
    writeFileSync(p, JSON.stringify([{ title: "A", error: "boom" }]))
    expect(await readErrorsFile(p)).toEqual([{ title: "A", error: "boom" }])
  })

  test("throws on malformed JSON", async () => {
    const p = join(dir, "bad.json")
    writeFileSync(p, "{not json")
    await expect(readErrorsFile(p)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Append failing tests for `findExistingIssue`**

```ts
describe("findExistingIssue", () => {
  test("returns null when gh returns []", async () => {
    const runGh: GhRunner = vi.fn().mockResolvedValue("[]\n")
    expect(await findExistingIssue(runGh)).toBeNull()
    expect(runGh).toHaveBeenCalledWith([
      "issue",
      "list",
      "--label",
      "sync-broken",
      "--state",
      "open",
      "--json",
      "number",
      "--limit",
      "1",
    ])
  })

  test("returns the first issue when gh returns one", async () => {
    const runGh: GhRunner = vi
      .fn()
      .mockResolvedValue('[{"number": 42}]\n')
    expect(await findExistingIssue(runGh)).toEqual({ number: 42 })
  })
})
```

- [ ] **Step 3: Append failing tests for `reportHealth`**

```ts
describe("reportHealth", () => {
  let dir: string
  let errorsPath: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sync-rh-int-"))
    errorsPath = join(dir, ".sync-errors.json")
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test("noop: clean run, no existing issue → only `issue list` is called", async () => {
    const runGh = vi.fn().mockResolvedValue("[]\n") as GhRunner
    const out = await reportHealth({
      status: "success",
      runUrl: RUN_URL,
      errorsPath,
      runGh,
    })
    expect(out.action).toBe("noop")
    expect(runGh).toHaveBeenCalledTimes(1)
  })

  test("create: failed run, no existing issue → list then create with body via stdin", async () => {
    const runGh = vi
      .fn()
      .mockResolvedValueOnce("[]\n") // list
      .mockResolvedValueOnce("https://github.com/.../issues/1\n") as GhRunner
    const out = await reportHealth({
      status: "failure",
      runUrl: RUN_URL,
      errorsPath,
      runGh,
    })
    expect(out.action).toBe("create")
    expect(runGh).toHaveBeenCalledTimes(2)
    const [args, stdin] = (runGh as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(args).toEqual([
      "issue",
      "create",
      "--label",
      "sync-broken",
      "--title",
      "[sync] failing",
      "--body-file",
      "-",
    ])
    expect(stdin).toContain("Sync from Cosense is currently failing.")
    expect(stdin).toContain(RUN_URL)
  })

  test("comment-broken: failed run + existing → list then comment", async () => {
    const runGh = vi
      .fn()
      .mockResolvedValueOnce('[{"number": 42}]\n') // list
      .mockResolvedValueOnce("") as GhRunner // comment
    writeFileSync(
      errorsPath,
      JSON.stringify([{ title: "A", error: "boom" }]),
    )
    const out = await reportHealth({
      status: "success",
      runUrl: RUN_URL,
      errorsPath,
      runGh,
    })
    expect(out.action).toBe("comment-broken")
    const [args, stdin] = (runGh as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(args).toEqual([
      "issue",
      "comment",
      "42",
      "--body-file",
      "-",
    ])
    expect(stdin).toContain("Still failing as of")
    expect(stdin).toContain("Per-page errors: 1")
  })

  test("comment-recovered-and-close: clean run + existing → comment then close", async () => {
    const runGh = vi
      .fn()
      .mockResolvedValueOnce('[{"number": 42}]\n') // list
      .mockResolvedValueOnce("") // comment
      .mockResolvedValueOnce("") as GhRunner // close
    const out = await reportHealth({
      status: "success",
      runUrl: RUN_URL,
      errorsPath,
      runGh,
    })
    expect(out.action).toBe("comment-recovered-and-close")
    expect(runGh).toHaveBeenCalledTimes(3)
    const [commentArgs, commentStdin] = (
      runGh as ReturnType<typeof vi.fn>
    ).mock.calls[1]
    expect(commentArgs).toEqual([
      "issue",
      "comment",
      "42",
      "--body-file",
      "-",
    ])
    expect(commentStdin).toBe(`Recovered at ${RUN_URL}. Closing.`)
    const [closeArgs] = (runGh as ReturnType<typeof vi.fn>).mock.calls[2]
    expect(closeArgs).toEqual(["issue", "close", "42"])
  })
})
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: failures referring to missing exports (`readErrorsFile`, `findExistingIssue`, `reportHealth`, `GhRunner`).

- [ ] **Step 5: Implement the I/O shell**

Append to `scripts/sync-report-health.ts`:

```ts
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { z } from "zod"

export type GhRunner = (args: string[], stdin?: string) => Promise<string>

export async function readErrorsFile(path: string): Promise<SyncError[]> {
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }
  if (text.trim() === "") return []
  return JSON.parse(text) as SyncError[]
}

export async function findExistingIssue(
  runGh: GhRunner,
): Promise<{ number: number } | null> {
  const out = await runGh([
    "issue",
    "list",
    "--label",
    "sync-broken",
    "--state",
    "open",
    "--json",
    "number",
    "--limit",
    "1",
  ])
  const arr = JSON.parse(out) as { number: number }[]
  return arr.length > 0 ? { number: arr[0].number } : null
}

export interface ReportHealthOptions {
  status: SyncStatus
  runUrl: string
  errorsPath: string
  runGh: GhRunner
}

export async function reportHealth(
  opts: ReportHealthOptions,
): Promise<{ action: ActionKind }> {
  const errors = await readErrorsFile(opts.errorsPath)
  const existing = await findExistingIssue(opts.runGh)
  const action = decideAction(opts.status, errors, existing)

  switch (action) {
    case "noop":
      return { action }
    case "create": {
      const { title, body } = formatNewIssue({
        runUrl: opts.runUrl,
        status: opts.status,
        errors,
      })
      await opts.runGh(
        [
          "issue",
          "create",
          "--label",
          "sync-broken",
          "--title",
          title,
          "--body-file",
          "-",
        ],
        body,
      )
      return { action }
    }
    case "comment-broken": {
      if (!existing) throw new Error("invariant: comment-broken requires existing issue")
      const body = formatBrokenComment({
        runUrl: opts.runUrl,
        status: opts.status,
        errors,
      })
      await opts.runGh(
        ["issue", "comment", String(existing.number), "--body-file", "-"],
        body,
      )
      return { action }
    }
    case "comment-recovered-and-close": {
      if (!existing) throw new Error("invariant: comment-recovered-and-close requires existing issue")
      const body = formatRecoveredComment(opts.runUrl)
      await opts.runGh(
        ["issue", "comment", String(existing.number), "--body-file", "-"],
        body,
      )
      await opts.runGh(["issue", "close", String(existing.number)])
      return { action }
    }
  }
}

const defaultRunGh: GhRunner = (args, stdin) => {
  return new Promise((resolveP, rejectP) => {
    const child = execFile("gh", args, (err, stdout) => {
      if (err) rejectP(err)
      else resolveP(stdout)
    })
    if (stdin && child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}

const envSchema = z.object({
  SYNC_STATUS: z.enum(["success", "failure"]),
  WORKFLOW_RUN_URL: z.string().url(),
})

const ERRORS_PATH = resolve(process.cwd(), ".sync-errors.json")

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = envSchema.parse(process.env)
  reportHealth({
    status: env.SYNC_STATUS,
    runUrl: env.WORKFLOW_RUN_URL,
    errorsPath: ERRORS_PATH,
    runGh: defaultRunGh,
  })
    .then(({ action }) => {
      console.log(`sync-report-health: ${action}`)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
```

The new imports (`execFile`, `readFile`, `resolve`, `z`) belong at the **top** of the file alongside other `import` statements, not at the bottom. After appending the code above, move the imports to the top so the file reads:

```ts
// scripts/sync-report-health.ts
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { z } from "zod"

export type SyncStatus = "success" | "failure"
// ... rest of the file unchanged
```

- [ ] **Step 6: Run the tests and confirm everything passes**

Run: `pnpm test:unit scripts/sync-report-health.test.ts`

Expected: all `decideAction`, `deriveFailureType`, `formatNewIssue`, `formatBrokenComment`, `formatRecoveredComment`, `readErrorsFile`, `findExistingIssue`, and `reportHealth` test cases pass.

- [ ] **Step 7: Run typecheck and lint**

Run: `pnpm test && pnpm lint:ci`

Expected: both succeed. (If Biome reorders imports, accept its formatting.)

- [ ] **Step 8: Commit**

```bash
git add scripts/sync-report-health.ts scripts/sync-report-health.test.ts
git commit -m "sync-report-health: I/O shell with injectable gh runner"
```

---

## Task 4: Wire the script into CI

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/sync.yml`

- [ ] **Step 1: Add the package.json script**

Open `package.json`. In the `"scripts"` object, immediately after the existing `"sync": "tsx scripts/sync-cosense.ts",` line, insert:

```json
    "sync:report-health": "tsx scripts/sync-report-health.ts",
```

The `"scripts"` block should now contain (relevant lines):

```json
    "sync": "tsx scripts/sync-cosense.ts",
    "sync:report-health": "tsx scripts/sync-report-health.ts",
    "test:unit": "vitest run",
```

- [ ] **Step 2: Modify the workflow YAML**

Open `.github/workflows/sync.yml` and apply three edits.

**Edit 2a:** Extend `permissions:` to include issues:

Find:
```yaml
    permissions:
      contents: write
```

Replace with:
```yaml
    permissions:
      contents: write
      issues: write
```

**Edit 2b:** Give the sync step an id and let it continue on error:

Find:
```yaml
      - name: Run sync
        run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
```

Replace with:
```yaml
      - name: Run sync
        id: sync
        continue-on-error: true
        run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
```

**Edit 2c:** Append two new steps at the end of the `steps:` list (after the existing `Upload sync artifacts` step):

```yaml
      - name: Report sync health
        if: ${{ always() && !inputs.dry_run }}
        env:
          SYNC_STATUS: ${{ steps.sync.outcome }}
          WORKFLOW_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm sync:report-health

      - name: Fail job if sync failed
        if: ${{ steps.sync.outcome == 'failure' }}
        run: exit 1
```

- [ ] **Step 3: Inspect the workflow diff**

Run: `git diff .github/workflows/sync.yml`

Visually confirm the diff contains exactly the three edits (2a, 2b, 2c) above and nothing else. Authoritative YAML validation happens when the workflow runs in CI.

- [ ] **Step 4: Run typecheck, lint, and full tests**

Run: `pnpm test && pnpm lint:ci && pnpm test:unit`

Expected: all three succeed.

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/sync.yml
git commit -m "sync workflow: report health to a sync-broken issue after each run"
```

---

## Task 5: Manual rollout — label bootstrap and smoke test

**Files:** none modified. This task is operational and runs against the live GitHub repo. It must be performed by a human with write access to `jaxx2104/blog` (the implementing agent should *describe* these steps in the PR description, not execute them automatically).

- [ ] **Step 1: Confirm the implementer is authenticated to `gh` against `jaxx2104/blog`**

Run: `gh auth status`

Expected: shows the active account with access to `jaxx2104/blog`.

- [ ] **Step 2: Create the `sync-broken` label (one-time)**

Run:
```bash
gh label create sync-broken \
  --repo jaxx2104/blog \
  --color B60205 \
  --description "Cosense sync workflow is currently failing"
```

Expected: `✓ Label created`. If the label already exists, `gh` prints `already exists` and exits non-zero — that is also acceptable; verify with `gh label list --repo jaxx2104/blog | grep sync-broken`.

- [ ] **Step 3: Open the PR**

Push the branch and open a PR against `main`. Include in the PR description:

- Link to `docs/superpowers/specs/2026-05-04-cosense-phase-3-design.md`
- The fact that `gh label create sync-broken` was run (Step 2)
- The smoke test plan in Step 5 below

- [ ] **Step 4: After merge, confirm the next scheduled run is green**

Wait for the next `*/30 * * * *` cron tick (or trigger immediately via `gh workflow run "Sync from Cosense" --repo jaxx2104/blog`). On a healthy run, observe:

- The workflow finishes green.
- `Report sync health` step logs `sync-report-health: noop` (no existing issue, no errors).
- No new issue with the `sync-broken` label is opened.

- [ ] **Step 5: Optional smoke test (failure path)**

Only do this if you want stronger confidence than the unit tests provide.

1. Temporarily replace the `COSENSE_SID` secret with garbage:
   ```bash
   gh secret set COSENSE_SID --repo jaxx2104/blog --body "invalid"
   ```
2. Trigger the workflow manually:
   ```bash
   gh workflow run "Sync from Cosense" --repo jaxx2104/blog
   ```
3. Observe in the run UI:
   - `Run sync` step is red.
   - `Report sync health` step is green and logs `sync-report-health: create`.
   - `Fail job if sync failed` step is red, so the overall run is red.
   - A new issue with the `sync-broken` label exists in the repo.
4. Restore the real secret:
   ```bash
   gh secret set COSENSE_SID --repo jaxx2104/blog --body "$REAL_SID_VALUE"
   ```
5. Trigger the workflow again. Observe:
   - `Run sync` is green.
   - `Report sync health` logs `sync-report-health: comment-recovered-and-close`.
   - The previously-opened issue is now closed with the recovery comment.

---

## Verification checklist (run before opening the PR)

- [ ] `pnpm test` — passes.
- [ ] `pnpm lint:ci` — passes.
- [ ] `pnpm test:unit` — all `scripts/sync-report-health.test.ts` cases pass; no regressions in `scripts/sync-cosense.test.ts` or `lib/sync/**/*.test.ts`.
- [ ] `git diff origin/main..HEAD --stat` shows exactly four files: `scripts/sync-report-health.ts`, `scripts/sync-report-health.test.ts`, `package.json`, `.github/workflows/sync.yml`, plus the spec/plan docs from earlier commits on the branch.
- [ ] No file under `lib/sync/`, `scripts/sync-cosense.ts`, or `content/posts/` has been modified.

---

## Out of scope (do not add)

- Slack / email notifications.
- Retry logic inside a single run.
- Persisting the orchestrator's crash trace to a file.
- Any change to `lib/sync/**`, `scripts/sync-cosense.ts`, or `content/posts/`.
- Backfilling blog-only posts to Cosense.
- Bidirectional sync.

If the implementer encounters a question whose answer would require extending into these areas, stop and ask before proceeding.
