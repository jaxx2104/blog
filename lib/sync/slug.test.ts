import { expect, test } from "vitest"
import { isValidSlug, slugForPageId } from "./slug"

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
