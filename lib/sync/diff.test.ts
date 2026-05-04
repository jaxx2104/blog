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
    expect(a.slug).toBe("0123456789abcdef01234567") // length-1 "a" falls back
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
