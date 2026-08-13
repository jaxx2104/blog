import { describe, expect, it } from "vitest"
import { AA_NORMAL_TEXT, contrastOn } from "../contrast"
import { codeTheme } from "./markdown"

/**
 * Code blocks paint their own background (`keepBackground: true`), so the
 * theme tokens in styles/tokens.css say nothing about whether the code inside
 * is readable — this is a second, self-contained palette.
 *
 * Dracula's comment colour fails AA against Dracula's own background, which
 * is why `codeTheme` overrides it. These assertions run over the whole palette
 * rather than that one colour, so a shiki upgrade that reshuffles the theme
 * cannot reintroduce the problem somewhere else.
 */
const background = codeTheme.colors?.["editor.background"]

/** Every distinct foreground the theme can assign to a token. */
function foregrounds(): Map<string, string[]> {
  const byColour = new Map<string, string[]>()
  for (const token of codeTheme.tokenColors ?? []) {
    const colour = token.settings?.foreground
    if (!colour || !/^#[0-9a-f]{6}$/i.test(colour)) continue
    const scopes = ([] as string[]).concat(token.scope ?? []).join(", ")
    byColour.set(colour, [...(byColour.get(colour) ?? []), scopes])
  }
  return byColour
}

describe("code block syntax theme", () => {
  it("declares the background the code is painted on", () => {
    expect(background).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it("assigns colours to tokens at all", () => {
    // Guards against the loop below passing because it found nothing.
    expect(foregrounds().size).toBeGreaterThan(5)
  })

  it("meets WCAG AA for every token colour", () => {
    const failing = [...foregrounds().entries()]
      .map(([colour, scopes]) => ({
        colour,
        ratio: contrastOn(colour, background as string),
        scopes: scopes.join(" | ").slice(0, 60),
      }))
      .filter(({ ratio }) => ratio < AA_NORMAL_TEXT)
      .map(
        ({ colour, ratio, scopes }) =>
          `${colour} ${ratio.toFixed(2)} ${scopes}`,
      )

    expect(failing).toEqual([])
  })

  it("keeps comments the most subdued token, just above the AA floor", () => {
    // Regression guard on the override itself: raising it further would make
    // comments compete with code, dropping it back reintroduces the 3.03 bug.
    const comment = codeTheme.tokenColors?.find((t) =>
      ([] as string[]).concat(t.scope ?? []).includes("comment"),
    )?.settings?.foreground
    expect(comment).toBeDefined()
    const ratio = contrastOn(comment as string, background as string)
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    expect(ratio).toBeLessThan(6)
  })
})
