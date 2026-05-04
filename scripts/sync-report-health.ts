// scripts/sync-report-health.ts

export type SyncStatus = "success" | "failure"

export interface SyncError {
  title: string
  error: string
}

export type ActionKind =
  | "noop"
  | "create"
  | "comment-broken"
  | "comment-recovered-and-close"

export function decideAction(
  status: SyncStatus,
  errors: SyncError[],
  existing: { number: number } | null,
): ActionKind {
  const broken = status !== "success" || errors.length > 0
  if (broken) return existing ? "comment-broken" : "create"
  return existing ? "comment-recovered-and-close" : "noop"
}
