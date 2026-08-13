/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Used by the tests that pin the palette: `styles/tokens.test.ts` for the
 * theme tokens and `lib/content/markdown.test.ts` for the syntax theme.
 * Colour contrast is the one accessibility defect that review cannot catch —
 * 4.49 and 4.50 look identical — so the ratios are asserted rather than eyeballed.
 *
 * Nothing at runtime imports this; it stays out of the client bundle.
 */

export type Rgb = [number, number, number]

/** WCAG AA for text below 18.66px bold / 24px regular. */
export const AA_NORMAL_TEXT = 4.5

/** WCAG AA for large text, and for non-text UI components. */
export const AA_LARGE_TEXT = 3

/** Accepts the two forms the stylesheets use: `#rrggbb` and `rgba(r, g, b, a)`. */
export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = Number.parseInt(hex[1], 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 }
  }
  const rgba = value
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/,
    )
  if (!rgba) throw new Error(`unsupported colour syntax: ${value}`)
  return {
    rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  }
}

/**
 * Composites a possibly-translucent colour onto an opaque backdrop.
 * Browsers blend in gamma space, so this has to happen before linearising —
 * blending the linear values instead overstates the result.
 */
export function flatten(value: string, backdrop: Rgb): Rgb {
  const { rgb, alpha } = parseColor(value)
  return rgb.map((c, i) => alpha * c + (1 - alpha) * backdrop[i]) as Rgb
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Ratio between 1 and 21. Order of the arguments does not matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  )
  return (hi + 0.05) / (lo + 0.05)
}

/** Convenience for the common case: a CSS colour string over an opaque backdrop. */
export function contrastOn(value: string, backdrop: string): number {
  const bg = parseColor(backdrop).rgb
  return contrastRatio(flatten(value, bg), bg)
}
