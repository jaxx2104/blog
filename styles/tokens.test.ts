import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { AA_NORMAL_TEXT, contrastOn, parseColor } from "../lib/contrast"

/**
 * Guards the colour-contrast fix. The site has two text surfaces — the
 * immersive brand-coloured page and the white reading panel — and each carries
 * exactly one primary and one secondary text token, so four ratios cover every
 * body-sized run of text on the site.
 *
 * Lighthouse flagged 67 elements on the page surface and 5 on the panel before
 * this was fixed. Both failures are invisible in review: the panel one missed
 * by 0.01, and the eye is a poor judge at 13px.
 *
 * The tokens are read out of the real stylesheet rather than duplicated, so
 * editing tokens.css is what this reacts to.
 */
function parseTheme(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`no ${selector} block in tokens.css`)
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start))
  const vars = new Map<string, string>()
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars.set(name, value.trim())
  }
  return vars
}

const css = readFileSync(
  fileURLToPath(new URL("./tokens.css", import.meta.url)),
  "utf8",
)

/**
 * Every body-sized run of text on the site is one of these four pairings.
 * --color-surface is deliberately absent: the only text it backs is the
 * link card's 32px placeholder glyph, which is large text (3:1).
 *
 * Not sealed with `as const` — it.each's parameter type is mutable, and the
 * readonly tuples `as const` produces do not assign to it.
 */
interface Surface {
  name: string
  backdrop: string
  /** [token, where it shows up] */
  text: [string, string][]
}

const SURFACES: Surface[] = [
  {
    name: "immersive page surface",
    backdrop: "--color-page",
    text: [
      ["--color-on-page", "headings, links, the logo"],
      ["--color-on-page-dim", "excerpts, dates, nav items, pager"],
    ],
  },
  {
    name: "white reading panel",
    backdrop: "--color-panel",
    text: [
      ["--color-ink", "article body"],
      ["--color-muted", "back link, tag badges, link card meta"],
    ],
  },
]

describe.each([
  ["light", ':root,\n[data-theme="light"]'],
  ["dark", '[data-theme="dark"]'],
])("%s theme", (_name, selector) => {
  const vars = parseTheme(css, selector)

  for (const surface of SURFACES) {
    describe(`text on the ${surface.name}`, () => {
      const backdrop = vars.get(surface.backdrop) as string

      it("defines its backdrop as an opaque colour", () => {
        expect(backdrop).toBeDefined()
        expect(parseColor(backdrop).alpha).toBe(1)
      })

      it.each(surface.text)(
        "%s meets WCAG AA for normal text (%s)",
        (token) => {
          const value = vars.get(token)
          expect(value).toBeDefined()
          expect(contrastOn(value as string, backdrop)).toBeGreaterThanOrEqual(
            AA_NORMAL_TEXT,
          )
        },
      )
    })
  }
})

describe("the maths behind these assertions", () => {
  // Anchors it against ratios anyone can verify by hand, so a bug in the
  // helper cannot quietly turn these guards into no-ops.
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastOn("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastOn("#ea2552", "#ea2552")).toBeCloseTo(1, 5)
  })

  it("reproduces the ratio that made the old brand pink fail", () => {
    // #fff0f2 on #ea2552 — 3.89, the value Lighthouse reported.
    expect(contrastOn("#fff0f2", "#ea2552")).toBeCloseTo(3.89, 2)
  })

  it("composites alpha against the backdrop before measuring", () => {
    // The old dim token: 2.66 once flattened, not the 3.89 of its solid form.
    expect(contrastOn("rgba(255, 240, 242, 0.74)", "#ea2552")).toBeCloseTo(
      2.66,
      2,
    )
  })
})
