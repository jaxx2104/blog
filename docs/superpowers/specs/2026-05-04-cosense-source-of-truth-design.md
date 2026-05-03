# 2026-05-04: Cosense as source of truth for blog posts

## Context

Posts are currently authored as Markdown files under `content/posts/<slug>/index.md`,
edited locally, and committed directly to the repository. The 109 posts on
`main` (oldest from 2013-08-06, newest from 2025-12-15) all follow this
flow. The Velite content layer reads these files at build time and emits
`.velite/` JSON consumed by TanStack Start during prerender.

The author has identified one primary pain point with this flow:
**writing must happen on a machine with the local editor and a working
git checkout**. Phone, tablet, and borrowed laptops are out. Among the
candidate replacement tools (Notion, Cosense/Scrapbox, Obsidian),
**Cosense** is the chosen primary source.

This spec defines a one-way, sync-time fetch pipeline that makes a
Cosense project the single source of truth for blog content while
preserving the existing Velite + TanStack Start + Cloudflare Pages
build pipeline unchanged.

Out of scope for this spec:

- Multi-source ingestion (Notion, Obsidian). The internal IR is shaped
  to allow future adapters, but no second adapter is built here.
- Bidirectional sync (Cosense ↔ md). Edits made by hand in `content/posts/`
  are overwritten by the next sync.
- A built-in browser CMS hosted on the blog itself.
- Real-time collaboration features beyond what Cosense already provides.
- Image optimization beyond what Velite already does.

## Goals

1. The author can write or edit a post on any device that runs Cosense
   (web, iOS, Android) and have it published to the blog without
   touching a git client.
2. The existing build pipeline (`pnpm build` = `velite build` + `vite
   build` + Cloudflare Pages) is **not modified**. The only thing that
   changes is the source of `content/posts/<id>/index.md`.
3. Existing URLs continue to resolve via redirects after the one-time
   migration. No old link 404s.
4. A Cosense API outage cannot break a Cloudflare Pages build.

## Non-goals

1. Preserving the exact existing URL slugs as canonical. Old URLs are
   redirected to new ones; they are not the new canonical form.
2. Avoiding overwrite of hand-edited Markdown. Sync is one-way and
   destructive on the repository side by design.
3. Supporting a publishing-flag workflow inside a shared Cosense
   project. This design assumes the Cosense project is dedicated to
   the blog (every page = one article).

## Architecture

```
                       ┌────────────────────────────────────────┐
   ✍️  any device   →  │  Cosense project (jaxx-blog)           │  source of truth
                       │  - 1 page = 1 article                  │
                       │  - images on Gyazo / scrapbox.io/files │
                       └────────────────────────────────────────┘
                                          │   HTTPS GET /api/pages/...
                                          ▼
                       ┌────────────────────────────────────────┐
   ⏰ cron (30 min)  → │  .github/workflows/sync.yml            │
                       │   └─ pnpm sync                          │
                       │       └─ scripts/sync-cosense.ts       │
                       │           ├─ fetch pages list           │
                       │           ├─ fetch each updated page    │
                       │           ├─ transform → md+frontmatter │
                       │           ├─ download images            │
                       │           └─ git diff → commit + push   │
                       └────────────────────────────────────────┘
                                          │   git push origin main
                                          ▼
                       ┌────────────────────────────────────────┐
                       │  GitHub repo: content/posts/<id>/      │
                       │   ├─ index.md   (generated, tracked)   │
                       │   └─ *.png/jpg  (downloaded)            │
                       │  + public/_redirects (old → new URL)   │
                       └────────────────────────────────────────┘
                                          │   Cloudflare Pages build
                                          ▼
                       ┌────────────────────────────────────────┐
                       │  Existing build (unchanged):            │
                       │   pnpm build = velite + vite build      │
                       │   → dist/client/ → Cloudflare Pages CDN │
                       └────────────────────────────────────────┘
```

All new code is added under `scripts/`, `lib/sync/`, and
`.github/workflows/`. No existing files in `app/`, `lib/` (outside
`lib/sync/`), `styles/`, `components/`, `velite.config.ts`, or
`vite.config.mts` are touched.

## Components

```
scripts/
  sync-cosense.ts            # orchestrator; the only CLI / GH Actions entry
  migrate-md-to-cosense.ts   # one-shot, deleted after migration completes

lib/sync/
  types.ts                   # IR (intermediate representation); the only stable contract
  cosense-client.ts          # Cosense API wrapper; fetch + zod-typed responses
  transform.ts               # Cosense page → IR
  scrapbox-to-md.ts          # Scrapbox notation → markdown string
  frontmatter.ts             # IR → YAML frontmatter
  slug.ts                    # Cosense page id → URL slug
  images.ts                  # Gyazo / scrapbox.io image URL → local file
  redirects.ts               # old slug → new slug map → public/_redirects body
  redirects-seed.json        # frozen data file: old path → new page id (written by migration, read by sync)
  fs-writer.ts               # idempotent writer for content/posts/<id>/
```

### Why this decomposition

1. **`types.ts` is the only stable boundary.** Cosense client returns
   IR; markdown emitter consumes IR. Adding a Notion adapter later
   means writing `notion-client.ts` + `notion-transform.ts`; the rest
   is reusable.
2. **`scrapbox-to-md.ts` is a pure function.** This is the highest-bug
   surface; isolating it as `(string) -> string` makes per-notation
   table tests trivial.
3. **`fs-writer.ts` is idempotent**: if the on-disk bytes match the
   intended bytes, do not touch the file. This keeps `git diff` clean
   on no-op runs.
4. **`scripts/sync-cosense.ts` stays under ~100 lines.** It orchestrates
   reads, transforms, and writes; it does not contain transform logic.

## Slug strategy

URLs are derived from the **Cosense page id** (the 24-char hex returned
by the Cosense API), not from the page title.

- New canonical URL: `/<page-id>/` (root-level, matching the existing
  `app/routes/$.tsx` splat route convention; all 109 existing posts
  already publish at `/<custom-path>/`, e.g. `/2025-purchases/`,
  `/php-replace-lf/`, via the `path` frontmatter field).
- Old URLs: redirected via `public/_redirects` (308) — see Migration.

Rationale: page id is **immutable across title and body edits**. A
title-derived slug would break URLs whenever the author renames a page,
and a Japanese title cannot be percent-encoded into a readable URL
anyway. The trade-off is an opaque URL; SEO is preserved through OGP
`<title>` and the existing internal post-link UI which renders the
human title.

## Frontmatter mapping

| Velite `postSchema` field | Source                                        |
|---------------------------|-----------------------------------------------|
| `title`                   | Cosense page title                            |
| `created_at`              | Cosense page `created` (UNIX → ISO 8601)      |
| `updated_at`              | Cosense page `updated` (UNIX → ISO 8601)      |
| `path`                    | `/<page-id>`                                  |
| `description`             | First non-empty body line, trimmed to 160ch   |
| `category`                | Omitted (Cosense has no category equivalent)  |
| `tags`                    | `#tag` syntax in body, plus inline `[tag]` links matching a small allowlist; both are optional |

If `postSchema` validation fails after this mapping, the page is
skipped (see Error handling).

## Data flow

1. **Trigger** — GitHub Actions cron (`*/30 * * * *`) or local
   `pnpm sync`.
2. **Read local state** — enumerate `content/posts/*/index.md`. Each
   directory name is a Cosense page id; each frontmatter `updated_at`
   is the watermark.
3. **Fetch list** — `GET /api/pages/<project>?limit=1000` returns
   `(id, title, updated)` for every page. Pagination via `skip` if the
   project exceeds the limit.
4. **Diff** — for each remote page, compare `updated` to local
   frontmatter `updated_at`. Classify as **new**, **updated**,
   **unchanged**, or (for local-only entries) **deleted**.
5. **Per-page work** — for new and updated pages: fetch full body, run
   transform, download referenced images into the post directory, and
   write `index.md` via `fs-writer.ts`. For deleted pages: remove the
   directory.
6. **Rebuild `_redirects`** — regenerate `public/_redirects` from the
   full set of (old slug → new id) mappings retained from the
   migration step (see below).
7. **Commit & push** — handled by the workflow, not the script. If
   `git status --porcelain` is empty after step 6, the workflow exits
   without committing.

State is stored exclusively in the repository itself (no
`.sync-state.json`). The combination of `content/posts/<id>/` directory
existence and frontmatter `updated_at` is sufficient to compute every
diff.

## Deletion semantics

Cosense is a perfect mirror. A page deleted in Cosense is deleted from
the blog on the next sync. This includes the post directory (Markdown
+ images). Recovery is via `git revert` on the sync commit.

**Safety net:** if the sync run would delete more than 50% of the
existing post directories, the script aborts before writing anything.
The threshold is `MAX_DELETE_RATIO` and overridable via env var. This
guards against a transient empty Cosense API response wiping the
archive.

## Migration: 109 existing md → Cosense

A one-shot script `scripts/migrate-md-to-cosense.ts` does the following
for each existing post:

1. Read the existing `content/posts/<old-dir>/index.md`.
2. Capture `frontmatter.path` (e.g. `/2025-purchases`) — this is the
   live URL today and must be kept resolvable post-migration.
3. Convert markdown body → Scrapbox notation (the inverse of the
   sync-time transform; same module, applied in reverse).
4. Upload to the target Cosense project via the page-create API.
5. Record the resulting Cosense page id.
6. Append `{ "old_path": "/2025-purchases", "new_id": "<page-id>" }`
   to `lib/sync/redirects-seed.json`.

After the migration:

- The 109 `content/posts/<old-dir>/` directories are deleted from the
  repository in the same migration PR.
- `public/_redirects` is generated from `redirects-seed.json` for the
  first time and committed.
- Subsequent sync runs only have to maintain `_redirects` (re-emit it
  from `redirects-seed.json` on every run); brand-new Cosense-native
  pages do not need entries in `redirects-seed.json` because they
  publish directly at `/<page-id>/` from day one.

The migration script is idempotent on the Cosense side via the
mapping file: rerunning skips entries already in `redirects-seed.json`.

The migration runs on the author's machine, not in CI, since
authoring a Cosense `COSENSE_SID` with write scope into GitHub
secrets just for a one-shot script is unnecessary risk.

## Error handling

Asymmetric policy: **read failures are tolerant, write failures that
could break the site are strict**.

| Failure                            | Behaviour                                                                 |
|------------------------------------|---------------------------------------------------------------------------|
| Cosense API 5xx / timeout          | Abort whole sync, exit non-zero. Workflow marks the run failed; no commit |
| Single page parse error            | Skip the page, continue, write entry to `.sync-errors.json`               |
| Image download failure             | Skip the **entire page** (do not write a half-broken md)                  |
| Velite `postSchema` rejects output | Skip the page (validation runs in `fs-writer.ts` before write)            |
| Pending deletes exceed 50%         | Abort whole sync                                                          |
| `_redirects` slug collision        | Abort whole sync (404 loop risk)                                          |
| `COSENSE_PROJECT` / `COSENSE_SID` missing | Exit non-zero on script start, before any network call             |

The workflow reads `.sync-errors.json` at the end of the run and
attaches a GitHub Actions warning annotation summarizing skipped pages.
The run does **not** fail on per-page errors; a follow-up cron run
gets another chance to fetch the page after the author fixes it.

## Test strategy

Following `CLAUDE.md`'s "contracts strict, implementation regenerable":

- **Unit (vitest)** for `lib/sync/`:
  - `scrapbox-to-md.ts`: per-notation table tests (`[link]`, `[* bold]`,
    code blocks, `table:`, image embeds, etc.). New notation discovered
    in the wild starts as a red test before implementation (TDD).
  - `frontmatter.ts`: round-trip IR ↔ YAML.
  - `slug.ts` and `redirects.ts`: collision detection.
- **Contract tests** for `cosense-client.ts`:
  - `fixtures/cosense/*.json` are real API responses captured once.
    Tests assert each fixture parses against the zod schema. Cosense
    schema drift is detected the next time fixtures are refreshed.
- **Integration test** for `scripts/sync-cosense.ts`:
  - Stubbed Cosense client returns fixture data; script writes into a
    temporary directory; output tree is compared against an expected
    snapshot. Idempotency is verified by running the script twice and
    asserting the second run is a no-op.
- **Existing build** (`pnpm test` for tsc, `pnpm build` for velite +
  vite) runs unchanged in CI as the final acceptance gate.
- **Dry-run mode** — `pnpm sync --dry-run` writes a `.sync-plan.json`
  describing the intended changes and exits without touching the
  filesystem. Useful before flipping the cron on for the first time.

CI additions: a new GitHub Actions step runs vitest. Existing
`lint:ci` and `test` (tsc) continue unchanged.

## GitHub Actions workflow shape

`.github/workflows/sync.yml`:

```yaml
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch: {}

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm sync
        env:
          COSENSE_PROJECT: ${{ secrets.COSENSE_PROJECT }}
          COSENSE_SID:     ${{ secrets.COSENSE_SID }}
      - name: commit & push
        run: |
          if [ -n "$(git status --porcelain content public)" ]; then
            git config user.name  "blog-sync[bot]"
            git config user.email "blog-sync@users.noreply.github.com"
            git add content public
            git commit -m "sync: pull from Cosense"
            git push origin main
          fi
      - name: report skipped pages
        if: always() && hashFiles('.sync-errors.json') != ''
        run: cat .sync-errors.json | jq . >> $GITHUB_STEP_SUMMARY
```

`workflow_dispatch` is included so the author can trigger an immediate
sync from the GitHub web UI ("どこからでも" requirement).

## Configuration surface

Environment variables (read by `scripts/sync-cosense.ts`):

| Var                 | Required | Default | Purpose                                  |
|---------------------|----------|---------|------------------------------------------|
| `COSENSE_PROJECT`   | yes      | —       | Cosense project name (URL component)     |
| `COSENSE_SID`       | yes      | —       | Cosense session cookie value             |
| `MAX_DELETE_RATIO`  | no       | `0.5`   | Abort if deletes exceed this fraction    |
| `SYNC_DRY_RUN`      | no       | `false` | Equivalent to `--dry-run` flag           |

`COSENSE_SID` is required even for public Cosense projects because
`/api/pages/<project>/<title>/text` returns the raw body only to
authenticated requests in some project settings.

## Phasing

This spec is large enough that a single implementation plan would be
unwieldy. Suggested split for the planning step:

- **Phase 1 — Sync infrastructure.** `lib/sync/*` (excluding
  `redirects-seed.json`), `scripts/sync-cosense.ts`,
  `.github/workflows/sync.yml`, vitest setup, fixtures. Acceptance:
  dry-run against a hand-populated test Cosense project produces the
  expected plan.
- **Phase 2 — Migration.** `scripts/migrate-md-to-cosense.ts`,
  `lib/sync/redirects-seed.json`, the bulk deletion of
  `content/posts/*/`, the first generated `public/_redirects`.
  Acceptance: spot-check at least 5 random old URLs return 308 in
  preview, and the first real sync run from the live cron is a no-op
  (because the migration already wrote everything).

The two phases ship as separate PRs. Phase 2 cannot land until Phase 1
is on `main`, but it can be developed in parallel using the same
`lib/sync/scrapbox-to-md.ts` module (used in reverse).

## Open questions

None at design time. The following will be decided during planning /
implementation:

- Exact Cosense project name (deferred to migration; the script accepts
  it via env var).
- Whether to keep `migrate-md-to-cosense.ts` in-tree after migration
  (lean: delete in the migration PR; alternative: keep under
  `scripts/archive/` for reference).

## Acceptance criteria

1. `pnpm sync --dry-run` against the populated Cosense project lists
   the expected create/update/delete actions.
2. After a real `pnpm sync`, `pnpm test` and `pnpm build` succeed
   without modification.
3. After the migration PR, every old URL of the form `/<old-path>/`
   (sourced from each existing post's `frontmatter.path`) returns a
   308 to its new `/<page-id>/` target on Cloudflare Pages.
4. Editing a Cosense page from a phone results in the change appearing
   on the blog within one cron interval.
5. Deleting a Cosense page removes the corresponding post directory
   from `main` within one cron interval.
6. Triggering `gh workflow run sync.yml` performs an immediate sync
   without waiting for the next cron tick.
