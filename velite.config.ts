import { readdir, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { assets, defineCollection, defineConfig } from "velite"
import { markdownConfig } from "./lib/content/markdown"
import { flushContent, postSchema } from "./lib/content/schema"

// NOTE: as of 2026-05-01, two posts are skipped during body processing
// because of missing local images in content/posts/<slug>/. They are
// pre-existing content gaps, not schema issues. Tracked in Phase 0 spec.
const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/index.md",
  schema: postSchema,
})

/**
 * Drops files in `output.assets` that this build did not emit.
 *
 * Velite copies assets in but never removes them — `output.clean` covers the
 * data directory only. Re-encoding an image changes its content hash, so the
 * old file lingers: after the webp migration the directory held 172 files for
 * 88 referenced images and had grown from 18MB to 23MB, plus 41 stale
 * subdirectories from a pre-velite layout. `public/` is copied verbatim into
 * `dist/`, so all of that ships.
 */
async function pruneStaleAssets(dir: string, keep: Set<string>): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return // first build — nothing to prune
  }
  await Promise.all(
    entries
      .filter((name) => !keep.has(name))
      .map((name) => rm(join(dir, name), { recursive: true, force: true })),
  )
}

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
  // `complete` rather than `prepare`: output.clean wipes .velite between
  // parsing and writing, so the per-post and per-page files have to land
  // after that. (It also means the pre-existing .velite/bodies/ directory
  // from the old layout disappears on the next build without extra work.)
  complete: async ({ posts }, { config }) => {
    // public/, so the client can fetch these by URL instead of importing them
    // — see the note on flushContent. vite copies public/ into dist/client/
    // verbatim, and public/content/ is gitignored build output.
    const contentDir = resolve(dirname(config.configPath), "public/content")
    await Promise.all([
      flushContent(contentDir, posts),
      // `assets` is velite's in-memory map of the files this build emitted,
      // keyed by output filename.
      pruneStaleAssets(config.output.assets, new Set(assets.keys())),
    ])
  },
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
