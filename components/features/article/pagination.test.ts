import { describe, expect, it } from "vitest"
import {
  POSTS_PER_PAGE,
  pageCount,
  pagePath,
  pageSlice,
  parsePageParam,
} from "./pagination"

const TOTAL = 117

describe("pageCount", () => {
  it("rounds up so the trailing partial page is still listed", () => {
    expect(pageCount(TOTAL)).toBe(6)
    expect(pageCount(POSTS_PER_PAGE)).toBe(1)
    expect(pageCount(POSTS_PER_PAGE + 1)).toBe(2)
  })

  it("keeps a home page when there is no content at all", () => {
    expect(pageCount(0)).toBe(1)
  })
})

describe("pageSlice", () => {
  const items = Array.from({ length: TOTAL }, (_, i) => i)

  it("covers every item exactly once across the pages", () => {
    const seen = Array.from({ length: pageCount(TOTAL) }, (_, i) =>
      pageSlice(items, i + 1),
    ).flat()
    expect(seen).toEqual(items)
  })

  it("leaves the remainder on the last page", () => {
    expect(pageSlice(items, 6)).toHaveLength(TOTAL - 5 * POSTS_PER_PAGE)
  })
})

describe("pagePath", () => {
  it("maps page 1 to the site root, not /page/1/", () => {
    expect(pagePath(1)).toBe("/")
  })

  it("maps later pages to their own prerendered URL", () => {
    expect(pagePath(2)).toBe("/page/2/")
  })
})

describe("parsePageParam", () => {
  it("accepts a page that was prerendered", () => {
    expect(parsePageParam("2", TOTAL)).toBe(2)
    expect(parsePageParam("6", TOTAL)).toBe(6)
  })

  it.each(["0", "-1", "abc", "", "7", "02", "2.0", " 2"])(
    "rejects %o",
    (raw) => {
      expect(parsePageParam(raw, TOTAL)).toBeNull()
    },
  )

  it("rejects 1, which is served at the site root instead", () => {
    expect(parsePageParam("1", TOTAL)).toBeNull()
  })
})
