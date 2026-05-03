// scripts/sync-cosense.ts
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import matter from "gray-matter"
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

async function readLocalState(): Promise<LocalPostState[]> {
  let entries: string[]
  try {
    entries = await readdir(POSTS_ROOT)
  } catch {
    return []
  }
  const out: LocalPostState[] = []
  for (const id of entries) {
    if (!/^[a-f0-9]{24}$/.test(id)) continue
    const front = matter(
      await readFile(join(POSTS_ROOT, id, "index.md"), "utf8"),
    ).data
    if (typeof front.updated_at !== "string") continue
    out.push({ id, updatedAt: new Date(front.updated_at) })
  }
  return out
}

async function readSeed(): Promise<RedirectSeedEntry[]> {
  try {
    return JSON.parse(await readFile(SEED_PATH, "utf8"))
  } catch {
    return []
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = envSchema.parse(process.env)

  const client = new CosenseClient({
    project: env.COSENSE_PROJECT,
    sid: env.COSENSE_SID,
  })
  const list = await client.listPages()
  const local = await readLocalState()
  const plan = computePlan(list.pages, local)

  const deletions = plan.actions.filter((a) => a.kind === "delete").length
  if (plan.localCount > 0 && deletions / plan.localCount > env.MAX_DELETE_RATIO) {
    throw new Error(`abort: would delete ${deletions}/${plan.localCount} posts`)
  }

  console.log(`plan: ${plan.actions.map((a) => a.kind).join(",")}`)

  if (args.dryRun) {
    await writeFile(
      resolve(process.cwd(), ".sync-plan.json"),
      JSON.stringify(plan, null, 2),
    )
    return
  }

  for (const action of plan.actions) {
    if (action.kind === "delete") {
      await deletePost(action.id, POSTS_ROOT)
      continue
    }
    if (action.kind === "unchanged") continue
    const page = await client.getPage(action.page.title)
    const post = transformPage(page)
    const postDir = join(POSTS_ROOT, post.id)
    await mkdir(postDir, { recursive: true })
    await downloadImages(post.images, postDir)
    await writePost(post, POSTS_ROOT)
  }

  const redirects = emitRedirects(await readSeed())
  if (redirects.length > 0) await writeFile(REDIRECTS_PATH, redirects)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
