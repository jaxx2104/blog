// scripts/sync-report-health.ts
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { z } from "zod"

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

export type GhRunner = (args: string[], stdin?: string) => Promise<string>

export async function readErrorsFile(path: string): Promise<SyncError[]> {
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }
  if (text.trim() === "") return []
  return JSON.parse(text) as SyncError[]
}

export async function findExistingIssue(
  runGh: GhRunner,
): Promise<{ number: number } | null> {
  const out = await runGh([
    "issue",
    "list",
    "--label",
    "sync-broken",
    "--state",
    "open",
    "--json",
    "number",
    "--limit",
    "1",
  ])
  const arr = JSON.parse(out) as { number: number }[]
  return arr.length > 0 ? { number: arr[0].number } : null
}

export interface ReportHealthOptions {
  status: SyncStatus
  runUrl: string
  errorsPath: string
  runGh: GhRunner
}

export async function reportHealth(
  opts: ReportHealthOptions,
): Promise<{ action: ActionKind }> {
  const errors = await readErrorsFile(opts.errorsPath)
  const existing = await findExistingIssue(opts.runGh)
  const action = decideAction(opts.status, errors, existing)

  switch (action) {
    case "noop":
      return { action }
    case "create": {
      const { title, body } = formatNewIssue({
        runUrl: opts.runUrl,
        status: opts.status,
        errors,
      })
      await opts.runGh(
        [
          "issue",
          "create",
          "--label",
          "sync-broken",
          "--title",
          title,
          "--body-file",
          "-",
        ],
        body,
      )
      return { action }
    }
    case "comment-broken": {
      if (!existing)
        throw new Error("invariant: comment-broken requires existing issue")
      const body = formatBrokenComment({
        runUrl: opts.runUrl,
        status: opts.status,
        errors,
      })
      await opts.runGh(
        ["issue", "comment", String(existing.number), "--body-file", "-"],
        body,
      )
      return { action }
    }
    case "comment-recovered-and-close": {
      if (!existing)
        throw new Error(
          "invariant: comment-recovered-and-close requires existing issue",
        )
      const body = formatRecoveredComment(opts.runUrl)
      await opts.runGh(
        ["issue", "comment", String(existing.number), "--body-file", "-"],
        body,
      )
      await opts.runGh(["issue", "close", String(existing.number)])
      return { action }
    }
  }
}

const defaultRunGh: GhRunner = (args, stdin) => {
  return new Promise((resolveP, rejectP) => {
    const child = execFile("gh", args, (err, stdout) => {
      if (err) rejectP(err)
      else resolveP(stdout)
    })
    if (stdin && child.stdin) {
      child.stdin.write(stdin)
      child.stdin.end()
    }
  })
}

const envSchema = z.object({
  SYNC_STATUS: z.enum(["success", "failure"]),
  WORKFLOW_RUN_URL: z.string().url(),
})

const ERRORS_PATH = resolve(process.cwd(), ".sync-errors.json")

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = envSchema.parse(process.env)
  reportHealth({
    status: env.SYNC_STATUS,
    runUrl: env.WORKFLOW_RUN_URL,
    errorsPath: ERRORS_PATH,
    runGh: defaultRunGh,
  })
    .then(({ action }) => {
      console.log(`sync-report-health: ${action}`)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
