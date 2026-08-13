/**
 * Re-encode the raster images under content/posts/<slug>/ and, where the win
 * is worth a rename, convert them to WebP and rewrite the references in the
 * post's index.md.
 *
 * Only the sources are touched. public/images/posts/ is Velite's output
 * (`clean: true` wipes it every build), so fixing the sources is what makes
 * the shipped assets smaller.
 *
 * Usage:
 *   npx tsx scripts/optimize-images.ts --dry-run   # report, write nothing
 *   npx tsx scripts/optimize-images.ts             # apply
 */
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises"
import { basename, dirname, extname, join } from "node:path"
import sharp from "sharp"

const POSTS_DIR = "content/posts"
const RASTER_RE = /\.(jpe?g|png|gif|webp)$/i

/**
 * Article body maxes out at --content-width (1000px) minus the cardwrap and
 * card padding (~48px each, twice), so ~808px. 1600px covers that at 2x DPR.
 */
const MAX_WIDTH = 1600

/** Skip the rewrite unless the candidate is at least this much smaller. */
const MIN_GAIN = 0.92

/** WebP quality per source kind. Screenshots stay lossless unless lossy wins big. */
const PHOTO_QUALITY = 80
const ANIMATION_QUALITY = 60
const GRAPHIC_QUALITY = 90
/** Only prefer lossy over lossless for graphics when it is this much smaller. */
const GRAPHIC_LOSSY_GAIN = 0.75

const EFFORT = 6

type Plan = {
  /** Absolute-ish repo-relative path of the source file. */
  file: string
  bytes: number
  format: string
  width: number
  height: number
  pages: number
  /** Repo-relative path to write. Same as `file` unless the extension changes. */
  target: string
  method: string
  newBytes: number
  /** `null` when the source is already in its best form and must be kept. */
  buffer: Buffer | null
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else if (RASTER_RE.test(entry.name)) out.push(path)
  }
  return out
}

/**
 * Every relative image reference in a post body, keyed by the basename it
 * resolves to. Both `![](./x.png)` and `<img src="x.png">` forms are used in
 * this repo, and the `./` prefix is inconsistent, so match on the filename.
 */
function referencedNames(markdown: string): Set<string> {
  const names = new Set<string>()
  const patterns = [/!\[[^\]]*\]\(([^)\s]+)/g, /<img[^>]*?src="([^"]+)"/g]
  for (const re of patterns) {
    for (const [, ref] of markdown.matchAll(re)) {
      if (/^https?:\/\//.test(ref) || ref.startsWith("/")) continue
      names.add(basename(ref))
    }
  }
  return names
}

async function buildPlan(file: string): Promise<Plan | null> {
  const bytes = (await stat(file)).size
  const meta = await sharp(file, { animated: true }).metadata()
  const format = meta.format ?? ""
  const width = meta.width ?? 0
  const height = meta.pageHeight ?? meta.height ?? 0
  const pages = meta.pages ?? 1
  if (!width || !height) return null

  const resize = width > MAX_WIDTH ? { width: MAX_WIDTH } : undefined
  const common = { file, bytes, format, width, height, pages, target: file }
  if (format === "webp" && resize === undefined) {
    // Already the target format and small enough. Re-encoding would stack
    // another lossy generation on it, so leave it and stay idempotent.
    return { ...common, method: "already webp", newBytes: bytes, buffer: null }
  }

  const open = () => {
    const s = sharp(file, { animated: pages > 1 })
    return resize ? s.resize(resize) : s
  }

  let buffer: Buffer
  let method: string
  if (pages > 1) {
    // Animated GIF -> animated WebP. GIF dithering is noise-like and
    // compresses badly, so lossless is not an option here.
    buffer = await open()
      .webp({ quality: ANIMATION_QUALITY, effort: EFFORT })
      .toBuffer()
    method = `animated webp q${ANIMATION_QUALITY}`
  } else if (format === "jpeg") {
    // Photographic source: lossy WebP beats mozjpeg at equal quality.
    buffer = await open()
      .webp({ quality: PHOTO_QUALITY, effort: EFFORT })
      .toBuffer()
    method = `webp q${PHOTO_QUALITY}`
  } else {
    // PNG/WebP source: screenshots and diagrams. Lossless is the default so
    // text stays crisp; take lossy only when it is dramatically smaller.
    const lossless = await open()
      .webp({ lossless: true, effort: EFFORT })
      .toBuffer()
    const lossy = await open()
      .webp({ quality: GRAPHIC_QUALITY, effort: EFFORT })
      .toBuffer()
    if (lossy.length < lossless.length * GRAPHIC_LOSSY_GAIN) {
      buffer = lossy
      method = `webp q${GRAPHIC_QUALITY}`
    } else {
      buffer = lossless
      method = "webp lossless"
    }
  }

  const dir = dirname(file)
  const target = join(dir, `${basename(file, extname(file))}.webp`)
  return {
    file,
    bytes,
    format,
    width,
    height,
    pages,
    target,
    method: resize ? `${method} +resize ${width}->${MAX_WIDTH}` : method,
    newBytes: buffer.length,
    buffer,
  }
}

/**
 * Swap the filename inside a post's own image references, never body prose.
 *
 * The path in front of the filename must stay relative: one post links a
 * legacy absolute `/wp/images/.../swift-logo-hero-1.jpg`, which points outside
 * the repo and must not be renamed just because a sibling file matches.
 */
function rewriteReferences(markdown: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const relative = "(?:\\.{1,2}/)*"
  return markdown
    .replace(
      new RegExp(`(!\\[[^\\]]*\\]\\(${relative})${escaped}(?=[)\\s])`, "g"),
      (_m, prefix) => `${prefix}${to}`,
    )
    .replace(
      new RegExp(`(<img[^>]*?src="${relative})${escaped}(?=")`, "g"),
      (_m, prefix) => `${prefix}${to}`,
    )
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run")
  const files = (await walk(POSTS_DIR)).sort()

  // Referenced-name index per post directory, so a rename can be verified to
  // have a home before it happens.
  const refs = new Map<string, Set<string>>()
  for (const dir of new Set(files.map(dirname))) {
    const md = join(dir, "index.md")
    try {
      refs.set(dir, referencedNames(await readFile(md, "utf8")))
    } catch {
      refs.set(dir, new Set())
    }
  }

  const plans: Plan[] = []
  for (const file of files) {
    const plan = await buildPlan(file)
    if (plan) plans.push(plan)
  }

  const worthwhile = (p: Plan) =>
    p.buffer !== null &&
    p.newBytes < p.bytes * MIN_GAIN &&
    (p.target === p.file ||
      (refs.get(dirname(p.file))?.has(basename(p.file)) ?? false))

  // A rename must not collide with a sibling that maps to the same .webp
  // name — 001.gif sits next to 001.jpg, and both are referenced. Collisions
  // are only counted among the files that will actually be written, then
  // broken by keeping the original extension in the stem.
  const targetCount = new Map<string, number>()
  for (const p of plans.filter(worthwhile))
    targetCount.set(p.target, (targetCount.get(p.target) ?? 0) + 1)
  const taken = new Set(files)
  for (const p of plans) {
    if (!worthwhile(p) || (targetCount.get(p.target) ?? 0) < 2) continue
    const stem = basename(p.file, extname(p.file))
    const alt = join(
      dirname(p.file),
      `${stem}-${extname(p.file).slice(1)}.webp`,
    )
    if (!taken.has(alt) && !plans.some((other) => other.target === alt)) {
      p.target = alt
      taken.add(alt)
    }
  }
  targetCount.clear()
  for (const p of plans.filter(worthwhile))
    targetCount.set(p.target, (targetCount.get(p.target) ?? 0) + 1)

  let before = 0
  let after = 0
  let shippedBefore = 0
  let shippedAfter = 0
  let orphanBytes = 0
  let orphans = 0
  let converted = 0
  let skipped = 0
  const mdEdits = new Map<string, Array<[string, string]>>()

  for (const plan of plans) {
    before += plan.bytes
    const dir = dirname(plan.file)
    const name = basename(plan.file)
    const renaming = plan.target !== plan.file
    const referenced = refs.get(dir)?.has(name) ?? false
    if (referenced) shippedBefore += plan.bytes
    else {
      orphans++
      orphanBytes += plan.bytes
    }
    const reasons: string[] = []

    if (plan.buffer === null) reasons.push(plan.method)
    else if (plan.newBytes >= plan.bytes * MIN_GAIN) reasons.push("no size win")
    if (renaming && !referenced) reasons.push("unreferenced (rename unsafe)")
    if (renaming && (targetCount.get(plan.target) ?? 0) > 1)
      reasons.push("unresolvable target name collision")

    if (reasons.length > 0) {
      after += plan.bytes
      if (referenced) shippedAfter += plan.bytes
      skipped++
      console.log(
        `SKIP  ${plan.file} (${(plan.bytes / 1024).toFixed(0)}KB) — ${reasons.join(", ")}`,
      )
      continue
    }

    after += plan.newBytes
    if (referenced) shippedAfter += plan.newBytes
    converted++
    const pct = (100 * (1 - plan.newBytes / plan.bytes)).toFixed(0)
    console.log(
      `WRITE ${plan.file} -> ${basename(plan.target)}  ` +
        `${(plan.bytes / 1024).toFixed(0)}KB -> ${(plan.newBytes / 1024).toFixed(0)}KB (-${pct}%)  [${plan.method}]`,
    )
    if (renaming) {
      const list = mdEdits.get(join(dir, "index.md")) ?? []
      list.push([name, basename(plan.target)])
      mdEdits.set(join(dir, "index.md"), list)
    }
    if (!dryRun && plan.buffer !== null) {
      await writeFile(plan.target, plan.buffer)
      if (renaming) await unlink(plan.file)
    }
  }

  if (!dryRun) {
    for (const [md, pairs] of mdEdits) {
      let body = await readFile(md, "utf8")
      for (const [from, to] of pairs) body = rewriteReferences(body, from, to)
      await writeFile(md, body)
    }
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)}MB`
  console.log(
    `\n${dryRun ? "[dry-run] " : ""}${plans.length} images: ${converted} rewritten, ${skipped} kept\n` +
      `on disk  ${mb(before)} -> ${mb(after)} (-${(100 * (1 - after / before)).toFixed(1)}%)\n` +
      // What Velite actually copies to public/images/posts — the rest are
      // orphans whose post links a remote image instead.
      `shipped  ${mb(shippedBefore)} -> ${mb(shippedAfter)} (-${(100 * (1 - shippedAfter / shippedBefore)).toFixed(1)}%)\n` +
      `orphans  ${orphans} files, ${mb(orphanBytes)}, not referenced by any index.md\n` +
      `markdown files touched: ${mdEdits.size}`,
  )
}

await main()
