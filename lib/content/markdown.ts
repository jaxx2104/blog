import rehypePrettyCode from "rehype-pretty-code"
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
    rehypeLinkCard,
  ],
}
