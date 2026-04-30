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
  // PHASE-0-TEMP (remove in Phase 4 with lib/posts.ts):
  // MarkdownOptions expects mutable PluggableList; rehype-pretty-code's
  // tuple form does not satisfy it. velite.config.ts is excluded from the
  // project tsconfig, so this directive will not surface to `pnpm test`
  // until Phase 4 re-evaluates that exclusion.
  // @ts-expect-error MarkdownOptions Pluggable[] vs rehype-pretty-code tuple
  markdown: markdownConfig,
})
