// scripts/sync-cosense.ts
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { createPost, deletePost, updatePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { parseFrontmatter } from "@/lib/sync/parse-frontmatter"
import { transformPage } from "@/lib/sync/transform"
import { DeleteThresholdError, type SyncPlan } from "@/lib/sync/types"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
  MAX_DELETE_ABS: z.coerce.number().int().nonnegative().default(5),
  MAX_DELETE_RATIO: z.coerce.number().nonnegative().default(1.0),
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
  maxDeleteAbs?: number
  maxDeleteRatio?: number
}

export interface RunResult {
  plan: SyncPlan
  errors: SyncError[]
}

async function dirExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false
    throw err
  }
}

async function resolveCreateSlug(
  postsRoot: string,
  preferredSlug: string,
  pageId: string,
): Promise<string> {
  if (!(await dirExists(join(postsRoot, preferredSlug)))) return preferredSlug
  const withSuffix = `${preferredSlug}-${pageId.slice(0, 6)}`
  if (!(await dirExists(join(postsRoot, withSuffix)))) return withSuffix
  throw new Error(
    `slug collision: both ${preferredSlug}/ and ${withSuffix}/ already exist`,
  )
}

export async function runSync(opts: RunOptions): Promise<RunResult> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  if (opts.dryRun) return { plan, errors: [] }

  // --- Threshold check (BEFORE any side effects) ---
  const maxAbs = opts.maxDeleteAbs ?? 5
  const maxRatio = opts.maxDeleteRatio ?? 1.0
  const deleteCount = plan.actions.filter((a) => a.kind === "delete").length
  const cosenseSourced = local.filter((s) => s.cosenseId).length
  const ratio = cosenseSourced > 0 ? deleteCount / cosenseSourced : 0
  if (deleteCount > maxAbs) {
    throw new DeleteThresholdError(
      `delete count ${deleteCount} exceeds MAX_DELETE_ABS=${maxAbs}`,
    )
  }
  if (ratio > maxRatio) {
    throw new DeleteThresholdError(
      `delete ratio ${ratio.toFixed(3)} exceeds MAX_DELETE_RATIO=${maxRatio.toFixed(3)}`,
    )
  }

  // Ensure postsRoot exists before any create actions.
  await mkdir(opts.postsRoot, { recursive: true })

  const errors: SyncError[] = []
  for (const action of plan.actions) {
    try {
      if (action.kind === "update") {
        const page = await opts.client.getPage(action.page.title)
        const post = transformPage(page)
        const dir = join(opts.postsRoot, action.blogDir)
        await downloadImages(post.images, dir, { fetch: opts.fetch })
        await updatePost(post, dir)
      } else if (action.kind === "create") {
        const page = await opts.client.getPage(action.page.title)
        const post = transformPage(page)
        const finalSlug = await resolveCreateSlug(
          opts.postsRoot,
          action.slug,
          page.id,
        )
        const dir = join(opts.postsRoot, finalSlug)
        await mkdir(dir, { recursive: false })
        try {
          await downloadImages(post.images, dir, { fetch: opts.fetch })
          await createPost(post, dir)
        } catch (innerErr) {
          // Rollback an empty/partial dir so the next tick is clean.
          await deletePost(dir).catch(() => {})
          throw innerErr
        }
      } else if (action.kind === "delete") {
        await deletePost(join(opts.postsRoot, action.blogDir))
      }
      // unchanged: nothing to do
    } catch (err) {
      let title: string
      if (action.kind === "delete") {
        title = `(delete cosense_id ${action.cosenseId})`
      } else if (action.kind === "create" || action.kind === "update") {
        title = action.page.title
      } else {
        title = `(unknown action: ${action.kind})`
      }
      errors.push({
        title,
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
  let create = 0
  let update = 0
  let unchanged = 0
  let del = 0
  for (const a of plan.actions) {
    if (a.kind === "create") create++
    else if (a.kind === "update") update++
    else if (a.kind === "unchanged") unchanged++
    else if (a.kind === "delete") del++
  }
  return `plan: ${create} create, ${update} update, ${unchanged} unchanged, ${del} delete, ${errors.length} errors (stubs: ${plan.stubCount})`
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
    maxDeleteAbs: env.MAX_DELETE_ABS,
    maxDeleteRatio: env.MAX_DELETE_RATIO,
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
