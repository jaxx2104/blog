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
