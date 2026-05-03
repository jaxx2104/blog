import type { CosenseListEntry, SyncAction, SyncPlan } from "./types"

export interface LocalPostState {
  id: string
  updatedAt: Date
}

export function computePlan(
  remote: CosenseListEntry[],
  local: LocalPostState[],
): SyncPlan {
  const actions: SyncAction[] = []
  const localById = new Map(local.map((l) => [l.id, l]))

  for (const page of remote) {
    const cur = localById.get(page.id)
    if (!cur) {
      actions.push({ kind: "create", page })
    } else if (Math.floor(cur.updatedAt.getTime() / 1000) < page.updated) {
      actions.push({ kind: "update", page })
    } else {
      actions.push({ kind: "unchanged", id: page.id })
    }
    localById.delete(page.id)
  }

  for (const stale of localById.keys()) {
    actions.push({ kind: "delete", id: stale })
  }

  return { actions, localCount: local.length }
}
