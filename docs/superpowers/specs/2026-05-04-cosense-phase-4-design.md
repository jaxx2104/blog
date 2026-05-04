# 2026-05-04: Cosense sync — Phase 4 (auto-publish + delete propagation)

## Context

Phase 2 (PR #702) reframed the sync model from Phase 1's "every Cosense
page becomes a blog post" to "a blog post stub is the publishing
decision". The intent at the time was to protect 48 already-matched
posts from URL drift and to leave 3 Cosense pages
(`Antigravity`, `clay`, `kashitaka`) unpublished until the author
manually opted them in.

In production use this opt-in step turned out to be the wrong
default. The author's intent is "anything I write on Cosense should
appear on the blog by default", and the manual stub creation has
become friction with no upside — there are no draft-only Cosense
pages the author wants to keep private. Cosense effectively *is* the
blog.

This phase reverses Phase 2's opt-in pivot for Cosense-sourced posts
while keeping its other improvements (title-then-id matching,
per-page error tolerance, atomic writes, `cosense_id` stamping). The
61 legacy blog-only posts are left untouched, distinguished by the
absence of a `cosense_id` field in their frontmatter.

## Mental model

| Concept                                 | Owner / lifecycle                                                    |
|-----------------------------------------|----------------------------------------------------------------------|
| Cosense page                            | Source of truth for any blog post that has a `cosense_id`            |
| Blog post **with** `cosense_id`         | Reflection of Cosense; sync may create, update, or delete it         |
| Blog post **without** `cosense_id` (61) | Hand-authored legacy; sync never touches it                          |
| Cosense page that disappears            | Triggers deletion of the blog post directory on the next sync        |

The `cosense_id` field is the contract that opts a directory in to
sync. Posts that have it are tracked by Cosense; posts that do not
are owned by the repo and never modified by sync.

## Goals

1. A new Cosense page appears on the blog within one cron tick of
   creation, with a stable URL slug derived from its title (or the
   page id as a fallback for non-ASCII titles).
2. A Cosense page that the author deletes vanishes from the blog
   within one cron tick of deletion. Removal is mechanical: the
   post's directory under `content/posts/` is removed.
3. The 61 legacy blog-only posts (no `cosense_id`) are never touched
   by sync — neither read for diff purposes beyond identity, nor
   modified, nor deleted.
4. Renaming or retitling a Cosense page propagates without breaking
   URLs: the existing stub directory is preserved, the frontmatter
   `title` is updated, and the URL stays at its original slug.
5. A catastrophic Cosense response (empty list, partial pagination,
   schema drift) cannot delete more posts than a documented threshold
   permits. Above the threshold, sync aborts and Phase 3's health
   reporter opens a `sync-broken` issue.

## Non-goals

1. **Backfilling the 61 legacy posts to Cosense.** Out of scope —
   they are valid as-is and rewriting them on Cosense would be
   error-prone.
2. **Bidirectional sync (blog → Cosense).** Out of scope. The
   author writes only on Cosense.
3. **Soft-deletes / drafts / unpublished states.** A deleted Cosense
   page deletes the blog post immediately. There is no
   intermediate "archived" state.
4. **Post body preservation across deletes.** When a Cosense page is
   deleted, the corresponding blog post directory and any locally
   downloaded images go with it. The author can recover from git
   history if needed.
5. **Migrating the 48 already-matched stubs to a different URL
   scheme.** Existing slugs (manually chosen years ago) stay where
   they are — matching by `cosense_id` ensures sync follows the
   directory regardless of slug shape.

## Architecture

The sync engine reverts two of Phase 2's deliberate restrictions:

1. **`SyncAction.create` is reintroduced.** A Cosense page that has
   no matching stub by `cosense_id` *or* title produces a `create`
   action. The orchestrator calls a new `createPost(post, postsRoot)`
   that writes a fresh `<postsRoot>/<slug>/index.md` with full
   frontmatter (`title`, `created_at`, `updated_at`, `cosense_id`)
   and downloads any referenced images.
2. **`SyncAction.delete` is reintroduced.** A stub that has a
   `cosense_id` whose value is no longer in the Cosense page list
   produces a `delete` action. The orchestrator calls
   `deletePost(blogDir)` to remove the directory.
3. **`SyncAction.skip` is removed.** Phase 2's "no-stub means skip"
   behavior is replaced by `create`. The `kind: "skip"` variant goes
   away, along with the `reason` field.

The 61 legacy posts are protected by a structural invariant: only
stubs whose frontmatter contains a `cosense_id` are eligible for
`delete`. A stub without `cosense_id` is invisible to the diff
stage's delete pass.

```
┌──────────────────────┐     ┌──────────────────────┐
│ Cosense list         │     │ content/posts/       │
│ (51 pages)           │     │  ├─ <existing-48>/   │ cosense_id present
│                      │     │  │   (matched)        │
│                      │     │  ├─ <legacy-61>/      │ NO cosense_id
│                      │     │  │   (untouched)      │
│                      │     │  └─ <new-3>/          │ created by sync
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └─────────►  diff  ◄─────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │ create | update |    │
              │ unchanged | delete   │
              └──────────────────────┘
```

## Slug strategy for newly-created stubs

For `update` actions the directory name is fixed (the stub already
exists). Slug logic only matters for `create` actions.

`lib/sync/slug.ts` gains `slugForTitle(title, pageId): string`:

1. ASCII-slugify the title: lowercase, strip everything that is not
   `[a-z0-9\s-]`, collapse whitespace runs to a single `-`, collapse
   `--+` runs, trim leading and trailing `-`.
2. If the resulting slug is at least 3 characters long, use it.
3. Otherwise, return the 24-hex `pageId` as the slug. (Pure-CJK
   titles fall through to this path; the URL is uglier but stable
   and collision-free.)

Collision handling — performed by the orchestrator, not by `slug.ts`:

- If `<postsRoot>/<slug>/` already exists when applying a `create`
  action, append the first 6 characters of `pageId` to produce
  `<slug>-<short-id>`.
- If `<postsRoot>/<slug>-<short-id>/` *also* exists, abort the
  whole sync with a clear error. This case is statistically
  unreachable (collision on the first 6 hex digits requires both a
  title clash and a partial id clash) and is treated as an
  invariant violation rather than a routine code path.

The 48 currently-matched stubs are not affected: their directories
already exist, sync routes them through `update`, and `slug.ts` is
never called.

## Delete propagation safety

A pair of thresholds guards against catastrophic Cosense API states
(empty list during an outage, partial pagination, schema drift that
the zod schema fails to parse):

| Env var               | Default | Meaning                                                       |
|-----------------------|---------|---------------------------------------------------------------|
| `MAX_DELETE_ABS`      | `5`     | Hard upper bound on the number of `delete` actions per run.   |
| `MAX_DELETE_RATIO`    | `0.05`  | Upper bound on `deletes / total-cosense-sourced-stubs` ratio. |

Either threshold violated → orchestrator throws a typed
`DeleteThresholdError` with the offending counts. The throw is
caught by the workflow's existing error path (the sync step is
already `continue-on-error: true` per Phase 3); Phase 3's health
reporter sees `SYNC_STATUS=failure` and opens a `sync-broken` issue
with the run URL. No deletes are performed in that run.

The next cron tick re-evaluates against fresh Cosense state. If the
underlying outage has cleared, the run succeeds and the reporter
closes the issue automatically.

The thresholds are configurable via the workflow YAML's `env:` block
on the `Run sync` step. The workflow change is a one-line addition;
no separate phase is needed.

A typical legitimate single-page deletion (1 page out of ~51,
ratio 0.02) passes both thresholds. Cosense returning an empty list
(51 deletes, ratio 1.0) fails both. A bug that mistakes 10 unrelated
pages for deletions (ratio 0.20) fails the ratio.

## Edge cases

| Case                                                  | Behavior                                                                                              |
|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Cosense page renamed (title change, id stable)        | Matched by `cosense_id`. URL unchanged. Frontmatter `title` and body refreshed.                       |
| Cosense page id changes (rare, e.g. project migrate)  | Matched by `nfc(title)` fallback. URL unchanged. Frontmatter `cosense_id` updated.                    |
| Cosense title duplicates an existing legacy slug      | New stub's slug gets `-<6-hex>` suffix. Original legacy post untouched.                               |
| Cosense title has no ASCII content                    | Slug is the 24-hex `pageId`. URL is `/0123456789abcdef01234567/` shape.                               |
| Stub has stale `cosense_id` (id no longer in Cosense) | `delete` candidate, subject to thresholds.                                                            |
| Stub has stale `cosense_id` AND title matches a remote| Handled in diff order: cosense_id lookup misses, title lookup hits → `update`. No phantom delete.     |
| Cosense list returns 0 pages                          | All Cosense-sourced stubs become delete candidates. Threshold trips. Run aborts; nothing deleted.     |
| zod schema parse fails (drift)                        | Orchestrator throws before diff runs. Phase 3 reporter handles surfacing.                             |
| Per-page `getPage` / `createPost` / `deletePost` fails | Tolerated by Phase 2's per-page error path: error logged to `.sync-errors.json`, run continues, Phase 3 reporter surfaces. |
| Race between sync and a manual git push               | Atomic file rename inside `updatePost`/`createPost` plus directory-level `deletePost` minimize harm. Final consistency restored on next cron tick. |

## Components

### Modified

**`lib/sync/types.ts`**
- `SyncAction` union becomes:
  ```ts
  export type SyncAction =
    | { kind: "create"; page: CosenseListEntry; slug: string }
    | { kind: "update"; page: CosenseListEntry; blogDir: string }
    | { kind: "unchanged"; id: string }
    | { kind: "delete"; blogDir: string; cosenseId: string }
  ```
  (`skip` is removed; `create` and `delete` are added.)
  The `slug` on a `create` action is the *preferred* slug from
  `slugForTitle`. The orchestrator may append a `-<6-hex>` suffix
  at apply time if the directory already exists; the diff stage
  does not touch the filesystem.
- New error class `DeleteThresholdError` exported for orchestrator
  use.

**`lib/sync/diff.ts`**
- Inputs unchanged.
- For each remote page:
  - matched by `cosense_id` or `nfc(title)` → emit `update` or
    `unchanged` per the existing time comparison.
  - unmatched → emit `create` with `slug = slugForTitle(page.title, page.id)`.
- For each local stub with `cosenseId` set and no matching remote
  page (by id) → emit `delete`.
- Local stubs *without* `cosenseId` are not considered for delete.
- Duplicate-title check stays.

**`lib/sync/slug.ts`**
- Add `slugForTitle(title: string, pageId: string): string` per the
  algorithm above.
- `slugForPageId` and `isValidSlug` retained.

**`lib/sync/fs-writer.ts`**
- Add `createPost(post: Post, postsRoot: string, slug: string): Promise<void>`:
  - Computes `blogDir = join(postsRoot, slug)`.
  - Throws if `blogDir` already exists (orchestrator handles
    collision recovery before calling).
  - Renders a fresh `index.md` with frontmatter:
    ```yaml
    ---
    title: <quoted>
    created_at: '<ISO8601>'
    updated_at: '<ISO8601>'
    cosense_id: <24-hex>
    ---

    <body>
    ```
  - Writes via the same `tmp + rename` atomic pattern used by
    `updatePost`.
  - Image downloading (`downloadImages`) is invoked from the
    orchestrator, not from `createPost` (mirrors the existing
    `update` path).
- Add `deletePost(blogDir: string): Promise<void>`:
  - Recursively removes `blogDir`. Idempotent if `blogDir` does not
    exist (treats ENOENT as a no-op so a retry after partial
    failure converges).
- Existing `updatePost` is unchanged.

**`scripts/sync-cosense.ts`**
- Read `MAX_DELETE_ABS` (default 5) and `MAX_DELETE_RATIO` (default
  0.05) from `process.env` via the existing zod schema.
- After computing the plan, count `delete` actions; if either
  threshold is exceeded, throw `DeleteThresholdError` (the workflow
  already turns this into a `sync-broken` issue via Phase 3's
  reporter).
- Dispatch `create` and `delete` actions in addition to the existing
  `update` and `unchanged`. Each per-action call (create, update,
  delete) runs inside the existing per-page `try/catch` so a single
  failure is logged to `.sync-errors.json` without aborting the
  rest of the run, exactly as Phase 2 does for `update`.
- For `create`: resolve collision (suffix with first 6 hex of
  `pageId` if `<slug>/` exists). If `<slug>-<short-id>/` also
  exists, throw a clearly-named error (`SlugCollisionError`).

### Tests modified or added

- `lib/sync/types.test.ts` — N/A (no behavior, schema only).
- `lib/sync/diff.test.ts` — replace `skip`-based cases with
  `create`-based cases; add cases for `delete` (cosense_id-bearing
  stub absent from remote → delete; legacy stub absent from remote
  → ignored).
- `lib/sync/slug.test.ts` — add cases for `slugForTitle`: pure
  English title, mixed Japanese/English, pure-CJK title (page-id
  fallback), short-result title (page-id fallback), title with
  punctuation only.
- `lib/sync/fs-writer.test.ts` — add cases for `createPost`
  (fresh write, throws on existing dir, atomic rename) and
  `deletePost` (removes directory, ENOENT no-op).
- `scripts/sync-cosense.test.ts` — add scenarios:
  1. New Cosense page with no matching stub → `create` action runs,
     stub directory is born with frontmatter and body.
  2. Cosense page deleted → `delete` action runs, stub directory is
     removed; legacy stubs unaffected.
  3. Slug collision with legacy stub → suffix path used.
  4. Threshold violation → orchestrator throws, no deletes
     performed.

### Untouched

- `scripts/sync-report-health.ts` — Phase 3's reporter reads only
  exit status and `.sync-errors.json`; the new `delete` action and
  threshold throw need no special handling there.
- `.github/workflows/sync.yml` — gains two env entries
  (`MAX_DELETE_ABS`, `MAX_DELETE_RATIO`) on the `Run sync` step.
  No structural changes.
- `lib/sync/cosense-client.ts`, `lib/sync/transform.ts`,
  `lib/sync/scrapbox-to-md.ts`, `lib/sync/parse-frontmatter.ts`,
  `lib/sync/images.ts`.
- `app/`, `components/`, `styles/`, `velite.config.ts`.

## Migration

The first sync run after Phase 4 lands will:

- Update bodies for the 48 currently-matched posts (no slug change).
- Create 3 new posts: `Antigravity`, `clay`, `kashitaka`. Slugs are
  derived from titles (`antigravity`, `clay`, `kashitaka`).
  `created_at` is taken from each Cosense page's `created` field;
  `cosense_id` is stamped.
- Delete 0 posts. (No Cosense page has been deleted; nothing trips
  the threshold.)

The 61 legacy posts are untouched.

The author's first observation will be three new posts appearing on
the blog. From then on, the relationship is "Cosense is the source
of truth; the blog mirrors it".

## Rollout

1. Merge the Phase 4 PR. The cron schedule is unchanged.
2. Confirm the next cron tick (within 30 minutes) creates the three
   expected posts and reports `sync-report-health: noop`.
3. Optional smoke test for delete propagation: rename or
   temporarily delete one Cosense page on the project, wait for the
   next tick, observe the corresponding blog directory disappearing
   (and reappearing on restoration). Both threshold defaults
   (`5` absolute, `5%` ratio) make a single-page deletion pass.

## Open questions resolved during brainstorming

- **Auto-publish vs. opt-in:** The author confirmed that drafts on
  Cosense are not a use case; everything written is intended for
  publication. Phase 2's opt-in model is reverted for
  Cosense-sourced posts.
- **Unpublish path:** Deletion on Cosense triggers deletion on the
  blog. No separate `draft: true` flag is added.
- **Slug strategy for non-ASCII titles:** Page-id fallback is
  preferred over a transliteration step (which would be lossy and
  non-reversible). The 3 known unmatched pages have ASCII titles
  and avoid this case in practice.
- **Catastrophic delete protection:** Two thresholds (`5` absolute,
  `5%` ratio) instead of a single one. Either trips abort.
