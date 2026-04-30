import { defineCollection, defineConfig } from "velite"
import { markdownConfig } from "./lib/content/markdown"
import { postSchema } from "./lib/content/schema"

// NOTE: as of 2026-05-01, two posts are skipped during body processing
// because of missing local images in content/posts/<slug>/. They are
// pre-existing content gaps, not schema issues. Tracked in Phase 0 spec.
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
