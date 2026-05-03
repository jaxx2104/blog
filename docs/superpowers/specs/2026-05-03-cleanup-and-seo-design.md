# 2026-05-03: Post-modernization cleanup and SEO/delivery improvements

## Context

Phase 5 of the TanStack Start migration shipped on `main` (commits `dabc114`,
`0db6390`, `7fb2fa5`). Several artifacts from the previous Next.js
incarnation, plus stale comments tied to the in-flight migration branches,
remain in the repository. SEO and delivery primitives that the Next.js
build used to provide implicitly (sitemap, RSS, cache headers) were never
re-introduced under the Vite + Cloudflare Pages stack.

This spec covers two parallel workstreams that fit in a single PR:

- **A. Cleanup** — remove migration-era leftovers and align README / docs
  with the current stack so contributors are not misled.
- **C. SEO / delivery** — add sitemap, RSS, robots.txt and Cloudflare
  Pages headers using only the data Velite already produces.

Out of scope for this spec (deferred to later work):

- Accessibility / semantics pass (footer landmark, aria-labels, FOUC fix).
- Test infrastructure introduction (vitest).
- Image srcset/webp pipeline and PWA service worker.
- Removal of `velite.config.ts`'s `@ts-expect-error` (verified active,
  external library issue, not yet fixable).
- HSTS / CSP headers (large blast radius, separate PR).

## A. Cleanup

### A1. Rewrite `README.md`

The current README claims "Next.js 15 + styled-components + MDX". All
three are wrong post-Phase 5. Replace with a description of the actual
stack: TanStack Start (Vite + React 19), Velite content layer, CSS
Modules, Cloudflare Pages deploy, Biome.

Sections to keep: Development commands, Writing Blog Posts (frontmatter
example must match the real Velite schema, not the old Next.js one),
Project Structure, License.

Sections to update or drop:
- Drop `pnpm export` (does not exist in `package.json`).
- Drop `pnpm start` framing as "production server"; it is `vite preview`.
- Replace ESLint references with Biome.
- Update Project Structure to include `velite.config.ts`, `wrangler.toml`,
  `build.sh`.

Language: English (per global instruction for public repositories).

### A2. Delete `static/` directory

`static/img/` contains 5 files (favicon.ico, apple-touch-icon.png,
android-chrome-{192,512}.png, profile.jpg). All five exist in
`public/images/` already. Vite serves `public/`, not `static/`, so
nothing in `static/` is reachable at runtime — confirmed by inspecting
`__root.tsx` favicon links (`/images/favicon-32x32.png` etc.) and
`manifest.json` (`/images/android-chrome-*`).

Process:
1. Run `diff -r static/img/ public/images/` for the 5 overlapping files.
2. If all identical: delete `static/img/` and `static/robots.txt` (the
   latter is replaced by `public/robots.txt` in C1).
3. If any differ: stop and surface the diff. Do not silently overwrite.
4. After both subdirs are gone, `rmdir static/`.

### A3. Delete `scripts/optimize-images.js`

Not referenced from `package.json` scripts, not imported anywhere, not
called from CI. `scripts/inspect-paths.ts` (the only consumer of
`gray-matter` outside Velite) stays.

### A4. Tidy `.gitignore`

Remove entries that no longer apply:
- `.next/`
- `next-env.d.ts`
- `out/`
- `build/`
- `# Next.js`, `# Vercel` section headings
- `public/images/posts` (Velite output is committed; verify with
  `git ls-files public/images/posts | head` before deleting)

Keep:
- `node_modules/`, `dist/`, `*.tsbuildinfo`
- `.velite/`, `.tanstack/`, `.tmp/`, `.playwright-mcp/`, `.worktrees/`
- `app/routeTree.gen.ts`, `.netlify/`, `.claude/`
- `.env*.local`, `.env`

Rename `# Next.js` → `# Build artifacts`. Drop `# Production` (single
entry `/build` is duplicate of `build/`).

### A5. Update `wrangler.toml` comments

Current header claims the file lives only on `modernize-stack-phase1`
and that `main` still emits Next.js `out/`. Both false on `main` after
Phase 5. Replace the comment block with two lines:

```
# Cloudflare Pages config for the TanStack Start prerender output.
# `dist/client/` is produced by `pnpm build` (velite + vite build).
```

Keep the two config lines (`name`, `pages_build_output_dir`) verbatim.

### A6. Trim `build.sh`

Remove the paragraph that narrates the Phase-4 migration and the now-
gone branch-aware logic. Final form:

```sh
#!/bin/bash
# Cloudflare Pages dashboard build command is `bash build.sh`.
set -euo pipefail
pnpm build
```

Do not delete the file: changing the dashboard build command is out of
scope for this PR.

### A7. Fix function names in `lib/CLAUDE.md`

`lib/CLAUDE.md` documents `getAllPosts()` and `getPostBySlug()`. The
actual `lib/posts.ts` exports `getPostByPermalink()` (cf. `app/CLAUDE.md`
which already uses the correct name). Replace the stale name; verify
against `lib/posts.ts` before writing the change.

## C. SEO / delivery

### C1. `public/robots.txt`

Create with:

```
User-agent: *
Allow: /
Sitemap: https://jaxx2104.info/sitemap.xml
```

The previous `static/robots.txt` (`User-agent: *\nDisallow:`) was never
served because Vite ignores `static/`. This file replaces it and adds
the sitemap pointer.

### C2. Sitemap generator (Vite plugin)

Add a small inline plugin in `vite.config.mts`:

- Hook: `writeBundle` on the client build only (skip SSR build).
- Inputs: `.velite/posts.json` (already loaded by `loadPermalinks`),
  `lib/site.ts` constants (`SITE_URL`).
- Output path: `dist/client/sitemap.xml`.
- Entries (all `<lastmod>` values use W3C Datetime / ISO 8601, e.g.
  `2026-05-03T00:00:00Z`):
  - `/` — `changefreq=daily`, `priority=1.0`, `lastmod=<build date>`
  - `/profile/` — `changefreq=monthly`, `priority=0.5`,
    `lastmod=<build date>`
  - Each `permalink` — `changefreq=monthly`, `priority=0.7`,
    `lastmod=<post.updated_at>`
- XML serialization: hand-written template literal. Escape `&`, `<`,
  `>`, `"`, `'` in URLs (defensive — none expected today).

Expected count after build: `1 + 1 + 109 = 111` `<url>` entries.

Failure mode: if `.velite/posts.json` is unreadable, the existing
`loadPermalinks` already warns and falls back to home-only. Sitemap
generation should mirror that — warn and emit a sitemap with just
`/` and `/profile/` rather than failing the build.

### C3. RSS feed (`feed.xml`)

Same plugin, same hook. Output `dist/client/feed.xml` as RSS 2.0:

- `<channel>`: `title`, `link` (`SITE_URL`), `description`
  (`SITE_DESCRIPTION`), `language=ja`, `lastBuildDate`.
- `<item>` (latest 30 by `created_at` desc):
  - `title` — post title
  - `link` — `SITE_URL + permalink`
  - `description` — post `excerpt` (already present in Velite output)
  - `pubDate` — RFC 822 from `created_at`
  - `guid isPermaLink="true"` — same as `link`
- No HTML body. Excerpt-only keeps escaping trivial and the feed small.

Wire into the document head: add to `app/routes/__root.tsx` `head().links`:

```ts
{
  rel: "alternate",
  type: "application/rss+xml",
  title: SITE_TITLE,
  href: "/feed.xml",
}
```

### C4. `public/_headers` for Cloudflare Pages

Cloudflare Pages reads `_headers` from the deployed root. Place it at
`public/_headers` so Vite copies it into `dist/client/_headers`.

Contents:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: interest-cohort=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/images/posts/*
  Cache-Control: public, max-age=31536000, immutable
```

Rationale:
- `/assets/*` — Vite-emitted JS/CSS chunks have content hashes in their
  filenames, safe to cache forever.
- `/images/posts/*` — Velite emits images with `[name]-[hash:6].[ext]`,
  also safe to cache forever.
- HTML and `sitemap.xml` / `feed.xml` use Cloudflare's default cache
  (no override here).

## Implementation order

The two workstreams are independent. Suggested order to keep diffs
small:

1. A4 (`.gitignore`) — touches no behavior.
2. A2 (`static/` deletion) + C1 (`public/robots.txt`) — paired; the
   robots file is what replaces `static/robots.txt`.
3. A3 (delete `optimize-images.js`).
4. A5, A6, A7 (comment / doc fixes).
5. A1 (README rewrite) — largest single edit, save for last in the
   cleanup batch.
6. C4 (`_headers`) — single file, no logic.
7. C2 + C3 (sitemap + RSS plugin) + `__root.tsx` link — share the same
   plugin, ship together.

## Verification

Local commands run after each batch:

- `pnpm test` (tsc) — must pass.
- `pnpm lint:ci` — must pass (no auto-fix).
- `rm -rf dist/ && pnpm build` — clean rebuild succeeds.
- After C2/C3/C4: confirm `dist/client/` contains `sitemap.xml`,
  `feed.xml`, `robots.txt`, `_headers`.
- `xmllint --noout dist/client/sitemap.xml` and `dist/client/feed.xml`
  parse cleanly.
- `grep -c '<url>' dist/client/sitemap.xml` returns `111`.
- `grep -c '<item>' dist/client/feed.xml` returns `30`.
- After A2: `git status` shows only deletions under `static/` and the
  new `public/robots.txt`.

## Risks and mitigations

- **`static/img/` files differ from `public/images/`** — diff check
  before delete; surface and stop if differences found.
- **`.velite/posts.json` schema drift** — already typed in
  `vite.config.mts` (`VeliteShape`); extend the type with the fields
  the new plugin needs (`title`, `excerpt`, `created_at`, `updated_at`)
  and let tsc catch drift.
- **prerender pages list staleness** — sitemap uses the same
  `loadPermalinks()` source, so the two cannot disagree.
- **Cloudflare Pages builds before `.velite/posts.json` exists** —
  `pnpm build` runs `pnpm velite:build` first; the file is guaranteed
  to exist by the time Vite plugins run. Existing fallback warning
  remains as a safety net.
