import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * Guards the colour-contrast fix. The site has two text surfaces — the
 * immersive brand-coloured page and the white reading panel — and each carries
 * exactly one primary and one secondary text token, so four ratios cover every
 * body-sized run of text on the site.
 *
 * Lighthouse flagged 67 elements on the page surface and 5 on the panel before
 * #750. Both failures are invisible in review: the panel one missed by 0.01,
 * and the eye is a poor judge at 13px.
 *
 * The tokens are read out of the real stylesheet rather than duplicated, so
 * editing tokens.css is what this reacts to.
 */
const AA_NORMAL_TEXT = 4.5

type Rgb = [number, number, number]

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

/** Handles the two forms tokens.css uses: `#rrggbb` and `rgba(r, g, b, a)`. */
function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = Number.parseInt(hex[1], 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 }
  }
  const rgba = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/,
  )
  if (!rgba) throw new Error(`unsupported colour syntax: ${value}`)
  return {
    rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  }
}

/** Browsers composite alpha in gamma space, so blend before linearising. */
function flatten(value: string, backdrop: Rgb): Rgb {
  const { rgb, alpha } = parseColor(value)
  return rgb.map((c, i) => alpha * c + (1 - alpha) * backdrop[i]) as Rgb
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (hi + 0.05) / (lo + 0.05)
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
      const backdrop = parseColor(vars.get(surface.backdrop) ?? "").rgb

      it.each(surface.text)(
        "%s meets WCAG AA for normal text (%s)",
        (token) => {
          const value = vars.get(token)
          expect(value).toBeDefined()
          const ratio = contrastRatio(
            flatten(value as string, backdrop),
            backdrop,
          )
          expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
        },
      )
    })
  }
})

describe("contrastRatio", () => {
  // Anchors the maths against ratios anyone can verify by hand.
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([234, 37, 82], [234, 37, 82])).toBeCloseTo(1, 5)
  })

  it("reproduces the ratio that made the old brand pink fail", () => {
    // #fff0f2 on #ea2552 — 3.89, the value Lighthouse reported.
    expect(contrastRatio([255, 240, 242], [234, 37, 82])).toBeCloseTo(3.89, 2)
  })
})
