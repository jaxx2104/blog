import { defineCollection, defineConfig } from "velite"
import { markdownConfig } from "./lib/content/markdown"
import { postSchema } from "./lib/content/schema"

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/index.md",
  schema: postSchema,
})

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/images/posts",
    base: "/images/posts/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts },
  markdown: markdownConfig,
})
