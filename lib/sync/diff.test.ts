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
    if (update?.kind === "update")
      expect(update.page.id).toBe("0123456789abcdef01234567")
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
