// scripts/sync-cosense.ts
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { updatePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { parseFrontmatter } from "@/lib/sync/parse-frontmatter"
import { transformPage } from "@/lib/sync/transform"
import type { SyncPlan } from "@/lib/sync/types"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
})

const POSTS_ROOT = resolve(process.cwd(), "content/posts")
const PLAN_PATH = resolve(process.cwd(), ".sync-plan.json")
const ERRORS_PATH = resolve(process.cwd(), ".sync-errors.json")

interface Args {
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  return {
    dryRun: argv.includes("--dry-run") || process.env.SYNC_DRY_RUN === "true",
  }
}

export interface SyncError {
  title: string
  error: string
}

export interface RunOptions {
  client: Pick<CosenseClient, "listPages" | "getPage">
  postsRoot: string
  errorsPath: string
  dryRun: boolean
  fetch?: typeof globalThis.fetch
}

export interface RunResult {
  plan: SyncPlan
  errors: SyncError[]
}

export async function runSync(opts: RunOptions): Promise<RunResult> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  if (opts.dryRun) return { plan, errors: [] }

  const errors: SyncError[] = []
  for (const action of plan.actions) {
    if (action.kind !== "update") continue
    try {
      const page = await opts.client.getPage(action.page.title)
      const post = transformPage(page)
      const dir = join(opts.postsRoot, action.blogDir)
      await downloadImages(post.images, dir, { fetch: opts.fetch })
      await updatePost(post, dir)
    } catch (err) {
      errors.push({
        title: action.page.title,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (errors.length > 0) {
    await writeFile(opts.errorsPath, JSON.stringify(errors, null, 2))
  }
  return { plan, errors }
}

async function readLocalStateAt(postsRoot: string): Promise<LocalPostState[]> {
  let entries: string[]
  try {
    entries = await readdir(postsRoot)
  } catch {
    return []
  }
  const out: LocalPostState[] = []
  for (const dir of entries) {
    let text: string
    try {
      text = await readFile(join(postsRoot, dir, "index.md"), "utf8")
    } catch {
      // Not a post directory (no index.md, or not a directory at all).
      continue
    }
    const fm = parseFrontmatter(text)
    if (!fm.title) continue
    out.push({
      blogDir: dir,
      title: fm.title,
      cosenseId: fm.cosense_id,
      updatedAt: fm.updated_at ? new Date(fm.updated_at) : new Date(0),
    })
  }
  return out
}

function summarise(plan: SyncPlan, errors: SyncError[]): string {
  let update = 0
  let unchanged = 0
  let skip = 0
  for (const a of plan.actions) {
    if (a.kind === "update") update++
    else if (a.kind === "unchanged") unchanged++
    else skip++
  }
  return `plan: ${update} update, ${unchanged} unchanged, ${skip} skip(no-stub), ${errors.length} errors (stubs: ${plan.stubCount})`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)
  runSync({
    client: new CosenseClient({
      project: env.COSENSE_PROJECT,
      sid: env.COSENSE_SID,
    }),
    postsRoot: POSTS_ROOT,
    errorsPath: ERRORS_PATH,
    dryRun: args.dryRun,
  })
    .then(async ({ plan, errors }) => {
      console.log(summarise(plan, errors))
      if (args.dryRun) {
        await writeFile(PLAN_PATH, JSON.stringify(plan, null, 2))
      }
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
