import { expect, test } from "vitest"
import { isValidSlug, slugForPageId, slugForTitle } from "./slug"

test("page id passes through verbatim", () => {
  expect(slugForPageId("0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("rejects non-id input", () => {
  expect(isValidSlug("Not An Id")).toBe(false)
  expect(isValidSlug("0123456789abcdef01234567")).toBe(true)
})

test("slugForPageId throws with descriptive message on invalid input", () => {
  expect(() => slugForPageId("not-a-page-id")).toThrow(
    /invalid Cosense page id/,
  )
})

test("slugForTitle: ASCII title becomes lowercase kebab-case", () => {
  expect(slugForTitle("Awesome Feature", "0123456789abcdef01234567")).toBe(
    "awesome-feature",
  )
})

test("slugForTitle: collapses runs of whitespace and dashes", () => {
  expect(
    slugForTitle("Hello   World---thing", "0123456789abcdef01234567"),
  ).toBe("hello-world-thing")
})

test("slugForTitle: strips punctuation that is not a dash", () => {
  expect(slugForTitle("Don't break, please!", "0123456789abcdef01234567")).toBe(
    "dont-break-please",
  )
})

test("slugForTitle: trims leading and trailing dashes", () => {
  expect(slugForTitle("--- foo ---", "0123456789abcdef01234567")).toBe("foo")
})

test("slugForTitle: pure-CJK title falls back to page id", () => {
  expect(slugForTitle("買ってよかったもの", "0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("slugForTitle: title that slugifies to under 3 chars falls back to page id", () => {
  expect(slugForTitle("a!", "0123456789abcdef01234567")).toBe(
    "0123456789abcdef01234567",
  )
})

test("slugForTitle: numeric-only title is kept when long enough", () => {
  expect(slugForTitle("2026", "0123456789abcdef01234567")).toBe("2026")
})

test("slugForTitle: mixed CJK + ASCII keeps the ASCII portion when long enough", () => {
  expect(
    slugForTitle("買ってよかったもの 2025 review", "0123456789abcdef01234567"),
  ).toBe("2025-review")
})

test("slugForTitle: rejects an invalid page id", () => {
  expect(() => slugForTitle("Anything", "not-a-page-id")).toThrow(
    /invalid Cosense page id/,
  )
})
