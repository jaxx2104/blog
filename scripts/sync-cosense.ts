// scripts/sync-cosense.ts
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { CosenseClient } from "@/lib/sync/cosense-client"
import { computePlan, type LocalPostState } from "@/lib/sync/diff"
import { deletePost, writePost } from "@/lib/sync/fs-writer"
import { downloadImages } from "@/lib/sync/images"
import { emitRedirects, type RedirectSeedEntry } from "@/lib/sync/redirects"
import { transformPage } from "@/lib/sync/transform"

const envSchema = z.object({
  COSENSE_PROJECT: z.string().min(1),
  COSENSE_SID: z.string().min(1),
  MAX_DELETE_RATIO: z.coerce.number().min(0).max(1).default(0.5),
})

const POSTS_ROOT = resolve(process.cwd(), "content/posts")
const REDIRECTS_PATH = resolve(process.cwd(), "public/_redirects")
const SEED_PATH = resolve(process.cwd(), "lib/sync/redirects-seed.json")

interface Args {
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  return {
    dryRun:
      argv.includes("--dry-run") || process.env.SYNC_DRY_RUN === "true",
  }
}

async function readSeed(): Promise<RedirectSeedEntry[]> {
  try {
    return JSON.parse(await readFile(SEED_PATH, "utf8"))
  } catch {
    return []
  }
}

export interface RunOptions {
  client: Pick<CosenseClient, "listPages" | "getPage">
  postsRoot: string
  redirectsPath: string
  seed: RedirectSeedEntry[]
  maxDeleteRatio: number
  dryRun: boolean
  fetch?: typeof globalThis.fetch
}

export async function runSync(
  opts: RunOptions,
): Promise<{ plan: ReturnType<typeof computePlan> }> {
  const list = await opts.client.listPages()
  const local = await readLocalStateAt(opts.postsRoot)
  const plan = computePlan(list.pages, local)

  const deletions = plan.actions.filter((a) => a.kind === "delete").length
  if (plan.localCount > 0 && deletions / plan.localCount > opts.maxDeleteRatio) {
    throw new Error(`abort: would delete ${deletions}/${plan.localCount} posts`)
  }

  if (opts.dryRun) return { plan }

  for (const action of plan.actions) {
    if (action.kind === "delete") {
      await deletePost(action.id, opts.postsRoot)
      continue
    }
    if (action.kind === "unchanged") continue
    const page = await opts.client.getPage(action.page.title)
    const post = transformPage(page)
    const postDir = join(opts.postsRoot, post.id)
    await mkdir(postDir, { recursive: true })
    await downloadImages(post.images, postDir, { fetch: opts.fetch })
    await writePost(post, opts.postsRoot)
  }

  const redirects = emitRedirects(opts.seed)
  if (redirects.length > 0) await writeFile(opts.redirectsPath, redirects)
  return { plan }
}

// Coupled to lib/sync/frontmatter.ts:emitFrontmatter — single-quoted ISO
// string. gray-matter@4 is the obvious tool for this but it calls
// js-yaml.safeLoad which was removed in js-yaml@4 (and the repo overrides
// js-yaml to >=4.x). Do not switch to gray-matter without first pinning
// js-yaml to ^3.x.
const UPDATED_AT_RE = /^updated_at:\s*'([^']+)'/m

async function readLocalStateAt(postsRoot: string): Promise<LocalPostState[]> {
  let entries: string[]
  try {
    entries = await readdir(postsRoot)
  } catch {
    return []
  }
  const out: LocalPostState[] = []
  for (const id of entries) {
    if (!/^[a-f0-9]{24}$/.test(id)) continue
    const text = await readFile(join(postsRoot, id, "index.md"), "utf8")
    const m = UPDATED_AT_RE.exec(text)
    if (!m) continue
    out.push({ id, updatedAt: new Date(m[1]) })
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)
  readSeed()
    .then((seed) =>
      runSync({
        client: new CosenseClient({
          project: env.COSENSE_PROJECT,
          sid: env.COSENSE_SID,
        }),
        postsRoot: POSTS_ROOT,
        redirectsPath: REDIRECTS_PATH,
        seed,
        maxDeleteRatio: env.MAX_DELETE_RATIO,
        dryRun: args.dryRun,
      }),
    )
    .then(async ({ plan }) => {
      console.log(`plan: ${plan.actions.map((a) => a.kind).join(",")}`)
      if (args.dryRun) {
        await writeFile(
          resolve(process.cwd(), ".sync-plan.json"),
          JSON.stringify(plan, null, 2),
        )
      }
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
