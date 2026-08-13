import { posts as velitePosts } from "../.velite"
import type { Post } from "./content/schema"

export type PostMeta = Post

/**
 * One lazily-loaded module per article body. Without `eager`, vite emits a
 * separate chunk for each file, so a route downloads only the body it
 * renders. Importing the bodies from posts.json instead put all 117 of them
 * (116KB gzip) into the entry chunk of every page.
 */
const bodyLoaders = import.meta.glob<string>("../.velite/bodies/*.json", {
  import: "default",
})

/** Key by filename stem so we do not depend on vite's glob key shape. */
const loaderById = new Map(
  Object.entries(bodyLoaders).map(([path, load]) => [
    path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, ""),
    load,
  ]),
)

const sorted = [...velitePosts].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
)

export function getAllPosts(): PostMeta[] {
  return sorted
}

/** Permalinks are normalised to `/<slug>/` by lib/content/schema.ts. */
export function getPostByPermalink(permalink: string): PostMeta | undefined {
  return sorted.find((p) => p.permalink === permalink)
}

export async function getPostBody(bodyId: string): Promise<string | undefined> {
  return await loaderById.get(bodyId)?.()
}
