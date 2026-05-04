// scripts/sync-report-health.test.ts
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

const ERR: SyncError[] = [{ title: "A", error: "boom" }]
const EXISTING = { number: 42 }
const RUN_URL = "https://github.com/jaxx2104/blog/actions/runs/123456789"

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
    const runGh: GhRunner = vi.fn().mockResolvedValue('[{"number": 42}]\n')
    expect(await findExistingIssue(runGh)).toEqual({ number: 42 })
  })
})

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
    writeFileSync(errorsPath, JSON.stringify([{ title: "A", error: "boom" }]))
    const out = await reportHealth({
      status: "success",
      runUrl: RUN_URL,
      errorsPath,
      runGh,
    })
    expect(out.action).toBe("comment-broken")
    const [args, stdin] = (runGh as ReturnType<typeof vi.fn>).mock.calls[1]
    expect(args).toEqual(["issue", "comment", "42", "--body-file", "-"])
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
    const [commentArgs, commentStdin] = (runGh as ReturnType<typeof vi.fn>).mock
      .calls[1]
    expect(commentArgs).toEqual(["issue", "comment", "42", "--body-file", "-"])
    expect(commentStdin).toBe(`Recovered at ${RUN_URL}. Closing.`)
    const [closeArgs] = (runGh as ReturnType<typeof vi.fn>).mock.calls[2]
    expect(closeArgs).toEqual(["issue", "close", "42"])
  })
})
