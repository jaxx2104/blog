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
