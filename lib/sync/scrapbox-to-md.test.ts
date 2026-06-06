import { describe, expect, test } from "vitest"
import { scrapboxToMarkdown } from "./scrapbox-to-md"

describe("scrapboxToMarkdown", () => {
  const cases: Array<[label: string, input: string, expected: string]> = [
    ["plain line", "hello world", "hello world"],
    ["bold via [* ]", "[* very important]", "**very important**"],
    ["heading h3 [** ]", "[** medium]", "### medium"],
    ["heading h2 [*** ]", "[*** big]", "## big"],
    ["heading h1 [**** ]", "[**** huge]", "# huge"],
    ["inline code", "use `pnpm sync` daily", "use `pnpm sync` daily"],
    [
      "external url",
      "[https://example.com Example]",
      "[Example](https://example.com)",
    ],
    ["bare url", "[https://example.com]", "<https://example.com>"],
    ["hashtag stays inline", "see #blog for more", "see #blog for more"],
    ["gyazo image", "[https://gyazo.com/abc123]", "![](abc123.png)"],
    ["scrapbox image", "[https://scrapbox.io/files/xyz.png]", "![](xyz.png)"],
    ["internal link", "[Other Page]", "**Other Page**"],
    ["blockquote", "> quoted", "> quoted"],
    ["heading clamps 5+ stars to h1", "[***** mega]", "# mega"],
    ["whitespace-only bracket stays as-is", "[   ]", "[   ]"],
    [
      "bare url with trailing period",
      "[https://example.com.]",
      "<https://example.com>.",
    ],
    ["bulleted list", " item1\n item2", "- item1\n- item2"],
    [
      "nested list",
      " parent\n  child\n   grandchild",
      "- parent\n  - child\n    - grandchild",
    ],
    ["tab-indented list", "\titem1\n\titem2", "- item1\n- item2"],
    [
      "list item with inline notation",
      " [https://example.com Example]",
      "- [Example](https://example.com)",
    ],
    [
      "paragraph followed by list",
      "TL;DR:\n first\n second",
      "TL;DR:\n\n- first\n- second",
    ],
    [
      "lists separated by a plain line stay separate",
      " a\nplain\n b",
      "- a\n\nplain\n\n- b",
    ],
  ]
  for (const [label, input, expected] of cases) {
    test(label, () => {
      expect(scrapboxToMarkdown(input)).toBe(expected)
    })
  }

  test("multi-line body keeps order and blank lines", () => {
    const input = "[**** Title]\n\nIntro paragraph\n\n[* note]"
    expect(scrapboxToMarkdown(input)).toBe(
      "# Title\n\nIntro paragraph\n\n**note**",
    )
  })

  test("consecutive lines become separate blocks (preserve line breaks)", () => {
    const input = "first paragraph\nsecond paragraph\nthird paragraph"
    expect(scrapboxToMarkdown(input)).toBe(
      "first paragraph\n\nsecond paragraph\n\nthird paragraph",
    )
  })

  test("fenced code block: 'code:filename.ts' followed by indented lines", () => {
    const input = "code:hello.ts\n const x = 1\n const y = 2"
    expect(scrapboxToMarkdown(input)).toBe(
      "```ts\nconst x = 1\nconst y = 2\n```",
    )
  })
})
