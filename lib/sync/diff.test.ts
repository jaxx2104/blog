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
    const decomposed = "é" // é (NFD, e + combining acute)
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
