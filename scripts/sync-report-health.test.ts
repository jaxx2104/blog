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
