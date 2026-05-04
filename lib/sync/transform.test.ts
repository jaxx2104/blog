import { expect, test } from "vitest"
import { transformPage } from "./transform"
import type { CosensePage } from "./types"

const page: CosensePage = {
  id: "0123456789abcdef01234567",
  title: "First Post",
  created: 1714521600,
  updated: 1714694400,
  lines: [
    { id: "l1", text: "First Post", userId: "u", created: 1, updated: 1 },
    { id: "l2", text: "Intro paragraph.", userId: "u", created: 1, updated: 1 },
    {
      id: "l3",
      text: "Body line with #blog #demo tags",
      userId: "u",
      created: 1,
      updated: 1,
    },
    {
      id: "l4",
      text: "[https://gyazo.com/ABCDEF123456.png]",
      userId: "u",
      created: 1,
      updated: 1,
    },
  ],
}

test("strips title line and emits IR", () => {
  const post = transformPage(page)
  expect(post.id).toBe("0123456789abcdef01234567")
  expect(post.title).toBe("First Post")
  expect(post.createdAt.toISOString()).toBe(
    new Date(1714521600 * 1000).toISOString(),
  )
  expect(post.description).toBe("Intro paragraph.")
  expect(post.tags).toEqual(["blog", "demo"])
  expect(post.body).toContain("Intro paragraph.")
  expect(post.body).not.toContain("First Post\n")
  expect(post.images).toEqual([
    { url: "https://gyazo.com/ABCDEF123456.png", filename: "ABCDEF123456.png" },
  ])
})

test("description falls back to empty string when body has no prose", () => {
  const post = transformPage({ ...page, lines: [page.lines[0]] })
  expect(post.description).toBe("")
})

test("description skips code: and blockquote lines", () => {
  const post = transformPage({
    ...page,
    lines: [
      page.lines[0],
      { id: "x", text: "code:hello.ts", userId: "u", created: 1, updated: 1 },
      { id: "y", text: " const x = 1", userId: "u", created: 1, updated: 1 },
      { id: "z", text: "> quoted", userId: "u", created: 1, updated: 1 },
      { id: "w", text: "real prose here", userId: "u", created: 1, updated: 1 },
    ],
  })
  expect(post.description).toBe("real prose here")
})

test("does not eat first body line when title differs from lines[0]", () => {
  const post = transformPage({
    ...page,
    title: "Renamed",
    lines: [
      {
        id: "l1",
        text: "Original Body Line",
        userId: "u",
        created: 1,
        updated: 1,
      },
      { id: "l2", text: "Second", userId: "u", created: 1, updated: 1 },
    ],
  })
  expect(post.description).toBe("Original Body Line")
  expect(post.body).toContain("Original Body Line")
})

test("hashtag dedup + scrapbox file image", () => {
  const post = transformPage({
    ...page,
    lines: [
      page.lines[0],
      {
        id: "a",
        text: "see #blog and #blog again",
        userId: "u",
        created: 1,
        updated: 1,
      },
      {
        id: "b",
        text: "[https://scrapbox.io/files/abc.jpg]",
        userId: "u",
        created: 1,
        updated: 1,
      },
    ],
  })
  expect(post.tags).toEqual(["blog"])
  expect(post.images).toEqual([
    { url: "https://scrapbox.io/files/abc.jpg", filename: "abc.jpg" },
  ])
})
