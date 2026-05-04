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

export type FailureType = "workflow-crash" | "partial-failure" | "both"

export function deriveFailureType(
  status: SyncStatus,
  errors: SyncError[],
): FailureType {
  if (status === "failure" && errors.length === 0) return "workflow-crash"
  if (status === "success" && errors.length > 0) return "partial-failure"
  return "both"
}

const ERROR_LIST_CAP = 20

function formatErrorList(errors: SyncError[]): string {
  const top = errors.slice(0, ERROR_LIST_CAP)
  const lines = top.map((e) => `- ${e.title} — ${e.error}`)
  const more = errors.length - top.length
  if (more > 0) lines.push(`- ... and ${more} more`)
  return lines.join("\n")
}

function errorBlock(errors: SyncError[]): string[] {
  if (errors.length === 0) return []
  const shown = Math.min(errors.length, ERROR_LIST_CAP)
  return [
    "",
    "<details>",
    `<summary>Per-page errors (top ${shown} of ${errors.length})</summary>`,
    "",
    formatErrorList(errors),
    "</details>",
  ]
}

export interface FailingArgs {
  runUrl: string
  status: SyncStatus
  errors: SyncError[]
}

export function formatNewIssue(args: FailingArgs): {
  title: string
  body: string
} {
  const failureType = deriveFailureType(args.status, args.errors)
  const lines = [
    "Sync from Cosense is currently failing.",
    "",
    `- Run: ${args.runUrl}`,
    `- Status: ${failureType}`,
    `- Per-page errors: ${args.errors.length}`,
    ...errorBlock(args.errors),
    "",
    "This issue is managed automatically by `scripts/sync-report-health.ts` and will close itself on the next clean run.",
  ]
  return { title: "[sync] failing", body: lines.join("\n") }
}

export function formatBrokenComment(args: FailingArgs): string {
  const failureType = deriveFailureType(args.status, args.errors)
  return [
    `Still failing as of ${args.runUrl}.`,
    "",
    `- Status: ${failureType}`,
    `- Per-page errors: ${args.errors.length}`,
    ...errorBlock(args.errors),
  ].join("\n")
}

export function formatRecoveredComment(runUrl: string): string {
  return `Recovered at ${runUrl}. Closing.`
}
