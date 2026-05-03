const PAGE_ID_RE = /^[a-f0-9]{24}$/

export function slugForPageId(pageId: string): string {
  if (!PAGE_ID_RE.test(pageId)) {
    throw new Error(`invalid Cosense page id: ${pageId}`)
  }
  return pageId
}

export function isValidSlug(s: string): boolean {
  return PAGE_ID_RE.test(s)
}
