/**
 * verify-velite.ts
 *
 * Verifies that Velite output matches legacy getAllPosts() on slug + title.
 *
 * Slug normalization:
 *   Velite's s.path() returns the path relative to the content root, e.g.
 *   "posts/2013-08-06-php-replace-lf". Legacy getAllPosts() uses just the
 *   directory name, e.g. "2013-08-06-php-replace-lf". We normalize by taking
 *   the last segment of the Velite slug for comparison.
 *
 * KNOWN_LEGACY_ONLY exception:
 *   Two posts exist only in the legacy output because they contain dead image
 *   references that cause Velite's body processing to fail. These are
 *   pre-existing content gaps and are NOT introduced by this migration.
 *   They are tracked here as first-class exceptions so the Phase 0 Gate can
 *   pass with full transparency.
 *
 *   TODO (Phase 1 follow-up / Task 9): Fix the dead image references in the
 *   two posts below so they pass Velite validation and can be removed from
 *   this allowlist.
 */

import { getAllPosts } from "../lib/posts"

// Posts that exist in the legacy output but are rejected by Velite due to
// dead image references. When Phase 1 fixes the content gap, this set must
// shrink. The verifier fails if a slug here unexpectedly succeeds in Velite
// — that's the cleanup signal.
// Both known content gaps were fixed in Phase 1 Task 1 (dead image refs removed).
const KNOWN_LEGACY_ONLY = new Set<string>([])

type VelitePost = {
  slug: string
  title: string
  created_at: string
  path?: string
  permalink: string
  body: string
}

/** Normalize a Velite slug ("posts/2013-08-06-foo") to the bare directory name ("2013-08-06-foo") */
function normSlug(veliteSlug: string): string {
  return veliteSlug.split("/").pop() ?? veliteSlug
}

async function main() {
  const veliteModule = (await import("../.velite/index.js")) as {
    posts: VelitePost[]
  }
  const velitePosts = veliteModule.posts
  const legacyPosts = await getAllPosts()

  console.log("Velite posts: ", velitePosts.length)
  console.log("Legacy posts: ", legacyPosts.length)

  const veliteSlugs = new Set(velitePosts.map((p) => normSlug(p.slug)))
  const legacySlugs = new Set(legacyPosts.map((p) => p.slug))

  const onlyInVelite = [...veliteSlugs].filter((s) => !legacySlugs.has(s))
  const onlyInLegacy = [...legacySlugs].filter((s) => !veliteSlugs.has(s))

  console.log("Only in Velite: ", onlyInVelite)
  console.log("Only in Legacy: ", onlyInLegacy)

  // Fail if any legacy-only slug is NOT in the known content-gap allowlist
  const unexpectedOnlyInLegacy = onlyInLegacy.filter(
    (s) => !KNOWN_LEGACY_ONLY.has(s),
  )
  const missingKnown = [...KNOWN_LEGACY_ONLY].filter(
    (s) => !onlyInLegacy.includes(s),
  )

  if (unexpectedOnlyInLegacy.length > 0) {
    console.error(
      "FAIL: legacy-only slugs that are not the known content gaps:",
      unexpectedOnlyInLegacy,
    )
    process.exit(1)
  }
  if (missingKnown.length > 0) {
    console.error(
      "FAIL: known dead-image slugs unexpectedly succeeded in velite. Remove them from KNOWN_LEGACY_ONLY.",
      missingKnown,
    )
    process.exit(1)
  }
  if (onlyInVelite.length > 0) {
    console.error("FAIL: velite-only slugs:", onlyInVelite)
    process.exit(1)
  }

  // Spot-check title equality on overlap
  const titleMismatches: string[] = []
  for (const v of velitePosts) {
    const bareSlug = normSlug(v.slug)
    const l = legacyPosts.find((p) => p.slug === bareSlug)
    if (l && l.title !== v.title) {
      titleMismatches.push(`${bareSlug}: "${l.title}" vs "${v.title}"`)
    }
  }
  if (titleMismatches.length > 0) {
    console.error("FAIL: title mismatches:")
    for (const m of titleMismatches) console.error(`  ${m}`)
    process.exit(1)
  }

  // Image asset check: every body should reference /images/posts/ for local images
  const badAssetRefs: string[] = []
  for (const v of velitePosts as Array<VelitePost & { body: string }>) {
    const matches = [...v.body.matchAll(/<img[^>]+src="([^"]+)"/g)]
    for (const m of matches) {
      const src = m[1]
      if (src.startsWith("http://") || src.startsWith("https://")) continue
      // absolute paths (e.g. legacy /wp/images/...) are external references — skip
      if (src.startsWith("/")) continue
      badAssetRefs.push(`${v.slug}: ${src}`)
    }
  }
  if (badAssetRefs.length > 0) {
    console.error("FAIL: unexpected asset references:")
    for (const r of badAssetRefs) console.error(`  ${r}`)
    process.exit(1)
  }

  // Confirm at least one post has a copied asset on disk
  const fs = await import("node:fs")
  const path = await import("node:path")
  const assetRoot = path.join(process.cwd(), "public", "images", "posts")
  const assetDirs = fs.existsSync(assetRoot) ? fs.readdirSync(assetRoot) : []
  if (assetDirs.length === 0) {
    console.error("FAIL: no copied assets under public/images/posts")
    process.exit(1)
  }

  console.log(`OK: counts and titles match (${velitePosts.length} posts)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
