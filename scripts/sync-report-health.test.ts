// scripts/sync-report-health.test.ts
import { describe, expect, test } from "vitest"
import {
  decideAction,
  deriveFailureType,
  formatBrokenComment,
  formatNewIssue,
  formatRecoveredComment,
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
