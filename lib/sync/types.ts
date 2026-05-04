import { z } from "zod"

/** Cosense page id format: 24 lowercase hex characters. */
export const PAGE_ID_RE = /^[a-f0-9]{24}$/

/** Cosense page object as returned by /api/pages/<project>/<title>. */
export const cosensePageSchema = z.object({
  id: z.string().regex(PAGE_ID_RE),
  title: z.string().min(1),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  lines: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      userId: z.string(),
      created: z.number().int(),
      updated: z.number().int(),
    }),
  ),
})
export type CosensePage = z.infer<typeof cosensePageSchema>

/** Cosense list entry as returned by /api/pages/<project>. */
export const cosenseListEntrySchema = z.object({
  id: z.string().regex(PAGE_ID_RE),
  title: z.string().min(1),
  updated: z.number().int().nonnegative(),
})
export type CosenseListEntry = z.infer<typeof cosenseListEntrySchema>

export const cosenseListResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  pages: z.array(cosenseListEntrySchema),
})

/** Internal Representation of a single blog post. */
export interface Post {
  id: string // Cosense page id, also the directory name + URL slug
  title: string
  createdAt: Date
  updatedAt: Date
  description: string // first non-empty body line, trimmed
  tags: string[]
  body: string // markdown body without frontmatter
  images: ImageRef[] // images referenced by body, downloaded by sync
}

export interface ImageRef {
  /** URL on Cosense / Gyazo / scrapbox.io. */
  url: string
  /** Filename used inside the post directory (also referenced by body). */
  filename: string
}

/** Output of diff stage. */
export type SyncAction =
  | { kind: "update"; page: CosenseListEntry; blogDir: string }
  | { kind: "unchanged"; id: string }
  | { kind: "skip"; title: string; reason: "no-stub" }

export interface SyncPlan {
  actions: SyncAction[]
  /** Number of stub directories scanned in `content/posts/`. */
  stubCount: number
}
