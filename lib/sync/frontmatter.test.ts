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
  expect(out).toContain('title: "Don\'t break"')
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
