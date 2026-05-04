import { slugForTitle } from "./slug"
import type { CosenseListEntry, SyncAction, SyncPlan } from "./types"

export interface LocalPostState {
  blogDir: string
  title: string
  cosenseId?: string
  updatedAt: Date
}

function nfc(s: string): string {
  return s.normalize("NFC")
}

export function computePlan(
  remote: CosenseListEntry[],
  local: LocalPostState[],
): SyncPlan {
  const byTitle = new Map<string, LocalPostState>()
  const byId = new Map<string, LocalPostState>()
  for (const stub of local) {
    const key = nfc(stub.title)
    if (byTitle.has(key)) {
      throw new Error(
        `duplicate stub title: ${JSON.stringify(stub.title)} (in ${stub.blogDir} and ${byTitle.get(key)!.blogDir})`,
      )
    }
    byTitle.set(key, stub)
    if (stub.cosenseId) byId.set(stub.cosenseId, stub)
  }

  const remoteIds = new Set(remote.map((p) => p.id))
  const matchedStubs = new Set<LocalPostState>()
  const actions: SyncAction[] = []

  for (const page of remote) {
    const stub = byId.get(page.id) ?? byTitle.get(nfc(page.title))
    if (!stub) {
      actions.push({
        kind: "create",
        page,
        slug: slugForTitle(page.title, page.id),
      })
      continue
    }
    matchedStubs.add(stub)
    if (Math.floor(stub.updatedAt.getTime() / 1000) >= page.updated) {
      actions.push({ kind: "unchanged", id: page.id })
    } else {
      actions.push({ kind: "update", page, blogDir: stub.blogDir })
    }
  }

  for (const stub of local) {
    if (!stub.cosenseId) continue // legacy posts are never deleted
    if (matchedStubs.has(stub)) continue // already handled as update/unchanged
    if (remoteIds.has(stub.cosenseId)) continue // matched by id but title-search hit differently — paranoia
    actions.push({
      kind: "delete",
      blogDir: stub.blogDir,
      cosenseId: stub.cosenseId,
    })
  }

  return { actions, stubCount: local.length }
}
