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
// dead image references. Must remain exactly this set — any change is a
// signal to investigate.
const KNOWN_LEGACY_ONLY = new Set([
  "2013-09-05-iphoto-photobook",
  "2024-06-10-jaxx-keycaps",
])

type VelitePost = {
  slug: string
  title: string
  created_at: string
  path?: string
  permalink: string
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
    console.warn(
      "WARN: known dead-image slugs unexpectedly succeeded in velite:",
      missingKnown,
    )
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

  console.log(
    `OK: titles match on ${velitePosts.length} velite posts; ${KNOWN_LEGACY_ONLY.size} legacy-only slugs are the known content gaps`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
