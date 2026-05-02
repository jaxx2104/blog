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
  // Re-evaluated in Phase 4 (2026-05-03), kept from Phase 0.
  // MarkdownOptions expects mutable PluggableList; rehype-pretty-code's
  // tuple form does not satisfy it. velite.config.ts is now part of the
  // project tsconfig (the Phase 0 exclude was removed in Phase 4), so
  // this directive is verified active by `pnpm test` — removing it
  // surfaces TS2322. No upstream issue filed as of 2026-05-03; if a
  // future dependency bump fixes the tuple typing, `pnpm test` will fail
  // on the unused @ts-expect-error and prompt removal.
  // @ts-expect-error MarkdownOptions Pluggable[] vs rehype-pretty-code tuple
  markdown: markdownConfig,
})
