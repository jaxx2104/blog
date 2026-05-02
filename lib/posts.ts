import { type Post, posts as velitePosts } from "../.velite"

export type PostMeta = Pick<
  Post,
  "title" | "created_at" | "updated_at" | "category" | "tags" | "excerpt"
> & {
  permalink: string
  slug: string
  thumbnail?: string
}

export type PostFull = PostMeta & {
  body: string
}

const THUMBNAIL_RE = /<img[^>]+src="(\/images\/posts\/[^"]+)"/

function deriveThumbnail(body: string): string | undefined {
  const match = body.match(THUMBNAIL_RE)
  return match?.[1]
}

function normalizePermalink(p: string): string {
  return p.endsWith("/") ? p : `${p}/`
}

function toMeta(post: Post): PostMeta {
  return {
    title: post.title,
    created_at: post.created_at,
    updated_at: post.updated_at,
    category: post.category,
    tags: post.tags,
    excerpt: post.excerpt,
    permalink: normalizePermalink(post.permalink),
    slug: post.slug,
    thumbnail: deriveThumbnail(post.body),
  }
}

function toFull(post: Post): PostFull {
  return {
    ...toMeta(post),
    body: post.body,
  }
}

const sorted = [...velitePosts].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
)

export function getAllPosts(): PostMeta[] {
  return sorted.map(toMeta)
}

export function getPostByPermalink(permalink: string): PostFull | undefined {
  const found = sorted.find((p) => p.permalink === permalink)
  return found ? toFull(found) : undefined
}

export function getAllPermalinks(): string[] {
  return sorted.map((p) => p.permalink)
}
