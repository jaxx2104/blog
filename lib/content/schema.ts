import { s } from "velite"

export const postSchema = s
  .object({
    title: s.string().min(1),
    created_at: s.isodate(),
    updated_at: s.isodate().optional(),
    path: s.string().regex(/^\/.+/, "path must start with '/'").optional(),
    category: s.string().optional(),
    tags: s.array(s.string()).default([]),
    slug: s.path(),
    body: s.markdown(),
    excerpt: s.excerpt({ length: 40 }),
  })
  .transform((data) => ({
    ...data,
    permalink: data.path ?? `/${data.slug.split("/").pop()}/`,
  }))

export type Post = ReturnType<typeof postSchema.parse>
