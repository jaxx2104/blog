import rehypePrettyCode from "rehype-pretty-code"
import type { ThemeRegistration } from "shiki"
import rehypeLinkCard from "../rehype-link-card"

// Duotone (deep pink x white) syntax theme matching the article plate's
// pink/white color system. Only tints from the approved palette are used:
// #ffffff (+ alpha) and the pink tints #ffcdde / #ffd6e6 / #ffe3ee / #fff5f9.
//
// NOTE on `tokenColors` vs `settings` (verified against dist, not README):
// - rehype-pretty-code (node_modules/rehype-pretty-code/dist/index.js,
//   `isJSONTheme`) detects "this is a single JSON theme object" by checking
//   `Object.hasOwn(value, "tokenColors")`. Without an own `tokenColors` key,
//   it misclassifies our object as a `Record<string, Theme>` (multi-theme
//   map) and tries to resolve each of its property values as a theme name —
//   this is exactly what produced the
//   "Theme `brutalist-duotone` is not included in this bundle" build error.
// - shiki's runtime normalization (@shikijs/primitive `normalizeTheme`)
//   copies `tokenColors` into `settings` only when `settings` is absent
//   (`if (theme.tokenColors && !theme.settings)`). An empty `settings: []`
//   would short-circuit that copy (`[]` is truthy) and silently drop all
//   token colors, so `settings` must not be present here — `tokenColors`
//   only.
// - The type used is `ThemeRegistration` (`Partial<ThemeRegistrationResolved>`,
//   all fields optional — see @shikijs/types dist/index.d.mts), the same
//   type shiki's own bundled theme .d.mts files declare for objects shaped
//   this way (checked node_modules/.pnpm/@shikijs+themes@*/.../*.d.mts).
//   `ThemeRegistrationRaw` (what rehype-pretty-code's `Options.theme` is
//   typed with) requires a `settings` array and so cannot describe a
//   tokenColors-only object without reintroducing the bug above; since
//   markdown.ts's `rehypePlugins` array has no contextual type here, nothing
//   actually checks this object against `ThemeRegistrationRaw` today.
const brutalistDuotoneTheme = {
  name: "brutalist-duotone",
  type: "dark",
  colors: {
    "editor.background": "#c2185b",
    "editor.foreground": "#ffffff",
  },
  tokenColors: [
    {
      // Scope-less default: base foreground for otherwise unstyled tokens.
      settings: {
        foreground: "#ffffff",
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: {
        foreground: "#ffffffa6",
        fontStyle: "italic",
      },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: {
        foreground: "#ffcdde",
      },
    },
    {
      scope: ["constant.numeric", "constant.language", "constant.character"],
      settings: {
        foreground: "#ffe3ee",
      },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: {
        foreground: "#ffffff",
        fontStyle: "bold",
      },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: {
        foreground: "#ffd6e6",
        fontStyle: "bold",
      },
    },
    {
      scope: ["variable", "support.variable"],
      settings: {
        foreground: "#fff5f9",
      },
    },
    {
      scope: ["entity.name.tag", "entity.name.type", "support.class"],
      settings: {
        foreground: "#ffffff",
        fontStyle: "bold",
      },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: {
        foreground: "#ffcdde",
        fontStyle: "italic",
      },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: {
        foreground: "#ffffffcc",
      },
    },
  ],
} satisfies ThemeRegistration

// Do NOT seal with `as const` — velite's MarkdownOptions expects mutable
// PluggableList; a readonly literal fails to assign (verified against
// velite v0.3.1 dist/index.d.ts).
export const markdownConfig = {
  remarkPlugins: [],
  rehypePlugins: [
    [
      rehypePrettyCode,
      {
        theme: brutalistDuotoneTheme,
        keepBackground: true,
        defaultLang: "plaintext",
      },
    ],
    rehypeLinkCard,
  ],
}
