import rehypePrettyCode from "rehype-pretty-code"
import rehypeLinkCard from "../rehype-link-card"

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
