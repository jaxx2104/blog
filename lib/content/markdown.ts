import rehypePrettyCode from "rehype-pretty-code"
import draculaTheme from "shiki/themes/dracula.mjs"
import rehypeImage from "../rehype-image"
import rehypeLinkCard from "../rehype-link-card"

/**
 * Dracula ships one colour that fails WCAG AA against its own background:
 * comments at #6272A4 on #282A36 measure 3.03:1. Every other foreground in
 * the theme clears 4.5 (the next lowest is #FF5555 at 4.53), so the theme is
 * kept and the single colour is lifted rather than swapped wholesale.
 *
 * #8293C7 is the same colour in OKLCH with lightness raised 0.56 → 0.67 and
 * hue and chroma untouched, which reaches 4.71:1 and leaves comments the most
 * subdued thing in a code block. `lib/content/markdown.test.ts` checks the
 * whole palette, so a shiki upgrade that reshuffles it fails loudly.
 *
 * The theme object from shiki is frozen — build a new one, do not mutate.
 */
const DRACULA_COMMENT = "#6272A4"
const DRACULA_COMMENT_AA = "#8293C7"

export const codeTheme = {
  ...draculaTheme,
  tokenColors: (draculaTheme.tokenColors ?? []).map((token) =>
    token.settings?.foreground === DRACULA_COMMENT
      ? {
          ...token,
          settings: { ...token.settings, foreground: DRACULA_COMMENT_AA },
        }
      : token,
  ),
}

// Do NOT seal with `as const` — velite's MarkdownOptions expects mutable
// PluggableList; a readonly literal fails to assign (verified against
// velite v0.3.1 dist/index.d.ts).
export const markdownConfig = {
  remarkPlugins: [],
  rehypePlugins: [
    [
      rehypePrettyCode,
      {
        theme: codeTheme,
        keepBackground: true,
        defaultLang: "plaintext",
      },
    ],
    // Before rehypeLinkCard on purpose: link cards inject their own OGP
    // thumbnail, which is remote (nothing to measure) and already carries
    // loading="lazy". Running first keeps the "first image is the LCP
    // candidate" decision on images the author actually wrote.
    rehypeImage,
    rehypeLinkCard,
  ],
}
