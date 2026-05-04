import { PAGE_ID_RE } from "./types"

export function slugForPageId(pageId: string): string {
  if (!PAGE_ID_RE.test(pageId)) {
    throw new Error(`invalid Cosense page id: ${pageId}`)
  }
  return pageId
}

export function isValidSlug(s: string): boolean {
  return PAGE_ID_RE.test(s)
}

export function slugForTitle(title: string, pageId: string): string {
  if (!PAGE_ID_RE.test(pageId)) {
    throw new Error(`invalid Cosense page id: ${pageId}`)
  }
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  if (slug.length >= 3) return slug
  return pageId
}
