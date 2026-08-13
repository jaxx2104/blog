import rehypePrettyCode from "rehype-pretty-code"
import rehypeImage from "../rehype-image"
import rehypeLinkCard from "../rehype-link-card"

// Do NOT seal with `as const` — velite's MarkdownOptions expects mutable
// PluggableList; a readonly literal fails to assign (verified against
// velite v0.3.1 dist/index.d.ts).
export const markdownConfig = {
  remarkPlugins: [],
  rehypePlugins: [
    [
      rehypePrettyCode,
      {
        theme: "dracula",
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
