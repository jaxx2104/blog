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

  const actions: SyncAction[] = []
  for (const page of remote) {
    const stub = byId.get(page.id) ?? byTitle.get(nfc(page.title))
    if (!stub) {
      actions.push({ kind: "skip", title: page.title, reason: "no-stub" })
      continue
    }
    if (Math.floor(stub.updatedAt.getTime() / 1000) >= page.updated) {
      actions.push({ kind: "unchanged", id: page.id })
    } else {
      actions.push({ kind: "update", page, blogDir: stub.blogDir })
    }
  }
  return { actions, stubCount: local.length }
}
