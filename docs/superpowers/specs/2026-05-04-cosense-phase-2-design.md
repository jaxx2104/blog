# 2026-05-04: Cosense sync — Phase 2 (publish-from-Cosense)

## Context

Phase 1 (PR #702) shipped a working Cosense → blog sync engine but its
sync model — "every Cosense page becomes a blog post under
`/<page-id>/`" — is incompatible with the actual repo state discovered
during Phase 1 acceptance:

- The Cosense project `jaxx2104` has **51 pages**.
- The blog has **109 posts** under `content/posts/`.
- **48 of the 51 Cosense pages already exist as blog posts** (title-identical, manually copied over the years — the oldest match dates to 2019).
- **3 Cosense pages are not yet on the blog** (`Antigravity`, `clay`, `kashitaka`); the author plans to publish them too.
- **61 blog posts have no Cosense counterpart** (older PHP / Mac / Titanium / etc. content the author has not touched in years).

Cosense is therefore not a single source of truth — it is a wiki / draft
space, parts of which the author has chosen to publish on the blog.
Phase 1's published interpretation ("everything in Cosense becomes a
blog post at `/<page-id>/`") would, if run today, create 48 duplicate
URLs and silently publish 3 pages the author may not be ready to
publish.

This spec replaces Phase 1's notion of source-of-truth migration with a
narrower, safer model: **a blog post stub is the publishing decision;
Cosense provides the content**.

## Mental model

| Role | Owner | Lifecycle |
|------|-------|-----------|
| **Publishing decision** (URL, slug, OGP, "this is on the blog") | Blog post directory under `content/posts/<slug>/index.md` | Created by hand (or by the optional helper in §Optional helpers) |
| **Body text + future edits** | Cosense page (matched by title) | Edited from any device |
| **Build + deploy** | Velite + TanStack Start + Cloudflare Pages | Unchanged from Phase 1 |
| **Blog-only posts** (61) | Blog md only | Untouched by sync |
| **Cosense-only pages** (drafts, wiki notes) | Cosense only | Never published unless a blog stub appears |

The author's "どこからでも書きたい" requirement is met: writing happens
in Cosense (web / iOS / Android), and edits flow to whichever blog
posts have a matching stub. New articles require one one-time gesture
(create the blog stub) to opt in.

## Goals

1. Cosense edits to a page that has a matching blog post propagate to
   that post's `index.md` within one cron interval, with no manual
   git work on the author's part.
2. Cosense pages that **do not** match any blog post are never
   auto-published. Drafts stay drafts.
3. Existing blog post URLs (109 of them) remain canonical and
   unchanged. No `/<page-id>/` URLs are introduced.
4. Adding a new article from Cosense requires exactly one manual
   gesture: create a stub `content/posts/<slug>/index.md` with the
   matching `title:` field. Sync fills in the body on the next run.
5. Phase 1's per-task safety properties (atomic writes, schema
   validation at the API boundary, idempotency) are preserved or
   strengthened.

## Non-goals

1. Importing the 61 blog-only posts into Cosense. They are valid as-is.
2. Deleting blog posts when the matching Cosense page is deleted.
   Cosense and blog deletion lifecycles are explicitly **decoupled**.
3. A bidirectional sync (blog → Cosense). Edits made directly to
   `index.md` are eventually overwritten by the next sync if the
   matching Cosense page changes.
4. Automatic title-rename handling on the blog side. If a user renames
   a Cosense page, sync uses the recorded `cosense_id` to keep the
   pairing — but does not move the blog post's directory.
5. Migration scripts to push existing blog md into Cosense.

## Architecture

```
                       ┌────────────────────────────────────────┐
   ✍️  any device   →  │  Cosense project (jaxx2104)            │  wiki / drafts / source
                       │  - 51 pages today                      │
                       │  - 48 of them have blog stubs          │
                       │  - 3 are drafts pending stubs          │
                       └────────────────────────────────────────┘
                                          │   HTTPS GET /api/pages/...
                                          ▼
                       ┌────────────────────────────────────────┐
   ⏰ cron (30 min)  → │  .github/workflows/sync.yml            │
                       │   └─ pnpm sync                          │
                       │       └─ scripts/sync-cosense.ts       │
                       │           ├─ fetch pages list           │
                       │           ├─ load blog post stubs       │
                       │           │    (title -> dir map)       │
                       │           ├─ for each Cosense page:     │
                       │           │   if stub matches: update   │
                       │           │   else: skip (draft)        │
                       │           ├─ download images             │
                       │           └─ commit + push if dirty     │
                       └────────────────────────────────────────┘
                                          │
                                          ▼
                       ┌────────────────────────────────────────┐
                       │  GitHub repo: content/posts/<slug>/    │
                       │   ├─ index.md   (existing, body refreshed) │
                       │   └─ *.png/jpg  (downloaded images)    │
                       │  No public/_redirects changes.         │
                       └────────────────────────────────────────┘
                                          │   Cloudflare Pages build
                                          ▼
                       Existing build pipeline, unchanged.
```

The directory structure under `content/posts/` is **untouched** by
Phase 2 — same date-prefix slugs, same URLs, same Velite output.

## Components — what changes from Phase 1

Phase 1's modules are reused as-is, with two surgical changes:

| Module | Change |
|--------|--------|
| `lib/sync/types.ts` | Add a new IR field `Post.blogDir: string` (the existing post directory name, used as the write target). Add `LocalPostState.title` and `LocalPostState.cosenseId?: string` so `diff.ts` can resolve matches. |
| `lib/sync/diff.ts` | Replace page-id-based diff with **title-then-id matching**: build a `Map<normalizedTitle, LocalPostState>`; for each Cosense page, find a stub by title; classify as `update` (if matched) or `skip` (if no stub). Drop the `delete` action — Cosense and blog lifecycles are decoupled. |
| `lib/sync/fs-writer.ts` | Write into `content/posts/<existing-dir>/index.md`, not `content/posts/<page-id>/`. Preserve the existing frontmatter's `path:`, `category:`, `tags:`, `created_at:`. Update `updated_at:` from Cosense. Replace body. Stamp a new `cosense_id:` field for stable pairing on next runs. |
| `lib/sync/transform.ts` | Stop deriving `path: /<page-id>`. The blog stub already has `path:`. The transform output now omits `path:`. |
| `lib/sync/redirects.ts` | **Removed**. No `_redirects` are generated by Phase 2 — there are no URL changes to redirect. The seed file `redirects-seed.json` from Phase 1's plan is never created. |
| `lib/sync/cosense-client.ts` | Implement `skip`-loop pagination (Phase 1 only asserted; Phase 2 must actually loop). |
| `scripts/sync-cosense.ts` | Per-page error tolerance: a single page failure writes to `.sync-errors.json` and continues; the workflow surfaces the count as an annotation but does not fail the run. Drop the `MAX_DELETE_RATIO` env (no deletes). |

## Slug strategy

There is no slug derivation in Phase 2. The blog stub's directory name
**is** the canonical location. Cosense's `id` is recorded as
`cosense_id:` in frontmatter, used only for stable pairing across
title renames.

If the author renames a Cosense page, the sync script:
1. Looks up by `cosense_id` first (stable — survives title rename).
2. If not found, falls back to title match.
3. If still not found, treats the page as a draft (no action).

## Frontmatter mapping

Sync writes only these fields, leaving everything else in the existing
frontmatter alone:

| Field | Source | Behaviour |
|-------|--------|-----------|
| `cosense_id` | Cosense `id` | Stamped on first match; preserved thereafter |
| `updated_at` | Cosense `updated` (ISO 8601) | Overwritten each sync if newer |
| `body` (the markdown after `---`) | `transformPage(page).body` | Overwritten each sync |

Untouched (preserved verbatim from the existing stub):

- `title`
- `created_at`
- `path`
- `description`
- `category`
- `tags`

Rationale: the author's existing posts have curated descriptions,
categories, and tags that should not be clobbered by automated
extraction. Cosense's hashtag-derived tags would silently overwrite
the author's choices.

## Title matching

Title comparison uses **trimmed exact match** (Cosense titles already
exclude leading/trailing whitespace; YAML frontmatter parsing strips
quotes). Strings are compared after `.normalize("NFC")` on both sides —
Cosense and macOS file systems can disagree on Unicode normalization
form for combining characters (the existing 109 posts were authored on
macOS over many years). No case-folding, no fuzzy matching — keeping
the contract trivial avoids accidentally pairing wrong posts.

If two blog stubs have the same title (which would be a user error in
the existing 109), sync aborts the whole run with a clear error
listing the conflicting paths.

## Data flow

1. **Trigger** — GitHub Actions cron (`*/30 * * * *`) or local
   `pnpm sync`.
2. **Fetch list** — paginated `GET /api/pages/<project>?limit=1000&skip=N`
   until the entire project is enumerated.
3. **Read local state** — for every `content/posts/*/index.md`:
   parse the frontmatter (regex-based, see Phase 1's `UPDATED_AT_RE`
   workaround), extract `title`, optional `cosense_id`, and
   `updated_at`. Build two maps: `byTitle` and `byId`.
4. **Pair** — for each Cosense page:
   - Try `byId.get(page.id)` first.
   - Fall back to `byTitle.get(page.title.trim())`.
   - On hit: enqueue an `update` action targeting the stub's
     directory.
   - On miss: enqueue a `skip` action with the page title (logged for
     operator awareness).
5. **Skip-or-update** — for each `update` action, compare Cosense
   `updated` (epoch seconds) to the stub's `updated_at` ISO timestamp.
   If equal or older, mark `unchanged` and skip the network round-trip.
6. **Per-page work** — for each remaining `update`:
   - `getPage(title)` → IR via `transformPage`.
   - Download images into the existing post directory (atomic write
     pattern from Phase 1).
   - Render new frontmatter by merging existing fields with the
     three sync-managed fields (`cosense_id`, `updated_at`, body).
   - Atomic write `index.md`.
   - On any per-page exception: log to `.sync-errors.json` with
     `{ title, error: msg }` and continue.
7. **Commit & push** — workflow only, not the script. Skipped if
   `git status --porcelain` is empty.

The script writes a one-line summary on stdout:
```
plan: 5 update, 2 unchanged, 3 skip(no-stub), 0 errors
```

## Deletion semantics

**Decoupled.** Cosense and blog deletions are independent:

- A page deleted in Cosense → the corresponding blog post is **left
  alone** on the blog. Sync simply stops finding the match. The post
  continues to render from its existing md.
- A blog post deleted by hand (the author runs `git rm -r
  content/posts/<dir>`) → next sync ignores the corresponding Cosense
  page (no stub = draft). The Cosense page is unaffected.

This eliminates Phase 1's `MAX_DELETE_RATIO` safety check (no longer
applicable) and the entire "delete" code path in `diff.ts` and the
orchestrator. Simplification, not feature loss — Phase 1's deletion
semantics were a forced consequence of the source-of-truth model that
this spec rejects.

## Optional helpers

Not required for Phase 2 acceptance, but each is worth ~30 LOC and
removes a manual step:

- **`pnpm blog:promote "Cosense Page Title"`** — generates a stub
  `content/posts/<YYYY-MM-DD-slug>/index.md` with `title:` and
  `created_at:` populated, the rest blank. The author edits `path:`
  and `description:` once, commits, and the next sync fills in the
  body.
- **`pnpm sync:report`** — runs a dry-run and prints the unmatched
  Cosense pages (drafts) so the author can see what's pending
  promotion.

These ship in a follow-up PR if appetite remains after the core spec
lands.

## Error handling

Tightened from Phase 1's "abort on first failure" to a per-page
tolerance pattern, since cron is enabled in this phase and a single
broken page must not block all subsequent syncs.

| Failure | Behaviour |
|---------|-----------|
| Cosense API 5xx / timeout on `listPages` | Abort whole sync; non-zero exit |
| Cosense API 5xx on a single `getPage` | Skip that page; record `{title, error}` to `.sync-errors.json`; continue |
| Image download failure | Skip the entire page (no half-broken md); record |
| Frontmatter parse failure on a stub | Skip; record `{path, error}`; continue |
| Duplicate stub title | Abort whole sync; print conflicting paths |
| `cosense_id` of a Cosense page collides with another stub's `cosense_id` | Abort whole sync (impossible without manual edit; bail loudly) |
| `COSENSE_PROJECT` / `COSENSE_SID` missing | Exit non-zero on script start |

The workflow surfaces `.sync-errors.json` as a GitHub Actions warning
annotation summary and uploads it as an artifact. The run does not
fail on per-page errors.

For the author's specific Cosense project (which is public),
`COSENSE_SID` may be a placeholder string. The script does not validate
the cookie value beyond non-empty. A separate spec change can later
make `COSENSE_SID` optional, but it is not in scope here.

## Test strategy

Phase 1's vitest suite mostly carries over. Net changes:

- **`lib/sync/diff.test.ts`** — rewrite for title-then-id matching,
  covering: title match, id match (after rename), no match (draft),
  duplicate-title abort.
- **`lib/sync/fs-writer.test.ts`** — add: preserves existing
  frontmatter, stamps `cosense_id` on first match, overwrites body
  only.
- **`scripts/sync-cosense.test.ts`** — integration test now uses
  fixtures with stub directories pre-populated, verifies updates land
  in the existing dirs (not new `<page-id>/` dirs), verifies skip
  count for unmatched pages, verifies idempotency.
- **New: `lib/sync/cosense-client.test.ts`** — pagination loop test
  (multiple `skip` calls).

Existing build (`pnpm test`, `pnpm build`) remains the final
acceptance gate.

## GitHub Actions workflow shape

`.github/workflows/sync.yml` (changes from Phase 1):

```yaml
on:
  schedule:
    - cron: "*/30 * * * *"      # NEW in Phase 2
  workflow_dispatch:
    inputs:
      dry_run:
        type: boolean
        default: false

jobs:
  sync:
    # ... same as Phase 1 ...
    steps:
      # ... checkout, pnpm setup, install ...
      - run: pnpm sync ${{ inputs.dry_run && '--dry-run' || '' }}
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
      - name: commit & push
        if: ! inputs.dry_run
        run: |
          if [ -n "$(git status --porcelain content)" ]; then
            git config user.name  "blog-sync[bot]"
            git config user.email "blog-sync@users.noreply.github.com"
            git add content
            git commit -m "sync: pull from Cosense"
            git push origin main
          fi
      - name: surface skipped/errored pages
        if: always() && hashFiles('.sync-errors.json') != ''
        run: |
          jq . .sync-errors.json >> $GITHUB_STEP_SUMMARY
      - name: upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: sync-output
          path: |
            .sync-plan.json
            .sync-errors.json
          if-no-files-found: ignore
```

Note `git add content` (not `content public`) — Phase 2 never touches
`public/`.

## Configuration surface

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `COSENSE_PROJECT` | yes | — | Cosense project name |
| `COSENSE_SID` | yes | — | Cosense session cookie (placeholder OK for public projects) |
| `SYNC_DRY_RUN` | no | `false` | Equivalent to `--dry-run` |

`MAX_DELETE_RATIO` from Phase 1 is removed.

## Phasing within Phase 2

This spec ships in **one PR** (Phase 2 is small enough — most code is
diff/transform tweaks rather than new modules). Suggested commit order
for the implementation plan:

1. Pagination loop in `cosense-client.ts` (with test) — independent.
2. Refactor `diff.ts` to title-then-id matching (with rewritten tests).
3. Refactor `fs-writer.ts` to merge-into-existing-stub semantics.
4. Drop `redirects.ts`, `redirects-seed.json` references; simplify
   orchestrator.
5. Per-page error tolerance + `.sync-errors.json`.
6. Workflow update: enable cron, drop `MAX_DELETE_RATIO`, add
   artifact upload.
7. Acceptance: `gh workflow run sync.yml --field dry_run=true`,
   inspect `.sync-errors.json` (expect 3 entries — `Antigravity`,
   `clay`, `kashitaka` — matching the known drafts pending
   stub creation).

## Acceptance criteria

1. After Phase 2 ships, a `dry_run: true` invocation against the
   current Cosense project produces a plan with **0 create, 48 update
   (or unchanged), 0 delete, 3 skip(no-stub)** — proving the new
   matching model works end-to-end.
2. Editing a Cosense page that has a matching blog post results in
   the change appearing on the blog within one cron interval. The
   blog post's URL does not change.
3. Deleting a Cosense page does not remove the blog post.
4. The author creating a blog stub for `Antigravity` (with a date
   slug, `title: Antigravity`, no body) and waiting one cron interval
   results in the body being filled from Cosense.
5. `pnpm test`, `pnpm test:unit`, `pnpm lint:ci`, and `pnpm build`
   all pass on the Phase 2 PR.

## Open questions

None at design time. The following are deliberately deferred:

- **`pnpm blog:promote` helper script.** Optional; ships in a
  follow-up PR if the manual stub-creation friction proves annoying.
- **`COSENSE_SID` made optional for public projects.** Cosmetic;
  current placeholder workaround is acceptable.
- **Bidirectional sync (blog → Cosense).** Out of scope. The author's
  workflow is one-way (write in Cosense, publish via stub).
- **Backfill of the 61 blog-only posts to Cosense.** Out of scope.
  These posts will continue to be edited via direct git operations
  if the author chooses to update them at all.

## Changes from Phase 1's spec

For reviewers comparing against `2026-05-04-cosense-source-of-truth-design.md`:

- **Source-of-truth claim removed.** Cosense is no longer the single
  source of truth; it is the authoring surface for posts that have
  opted into publishing via a blog stub.
- **`/<page-id>/` URLs removed.** All publishing happens at the
  existing blog post URLs.
- **Migration step removed.** No bulk import of blog md into Cosense.
- **`public/_redirects` generation removed.** Phase 2 never writes to
  `public/`.
- **Mirror deletion removed.** Cosense delete no longer cascades to
  the blog.
- **`MAX_DELETE_RATIO` removed.** No deletions to guard.
- **Per-page error tolerance promoted from "deferred" to "required"**
  because cron is enabled this phase.
- **Pagination loop required**, not just asserted (Phase 1 had an
  assertion-only stub).
