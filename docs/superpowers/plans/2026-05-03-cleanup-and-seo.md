# Cleanup and SEO/delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove migration-era leftovers (Workstream A) and add sitemap, RSS feed, robots.txt and Cloudflare Pages headers (Workstream C) in a single PR.

**Architecture:** Pure additions and deletions; no runtime behavior change beyond a new `<link rel="alternate">` and three static files in `dist/client/`. SEO artifacts are emitted by an inline Vite plugin that reads `.velite/posts.json` (already loaded for prerender) — no new runtime deps.

**Tech Stack:** Vite 8, TanStack Start, Velite 0.3, TypeScript 5.8, Biome 2, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-05-03-cleanup-and-seo-design.md`

**Branch:** `cleanup-and-seo` (already created from `origin/main`).

---

## File Structure

**Created:**
- `public/robots.txt` — replaces `static/robots.txt`, adds sitemap pointer.
- `public/_headers` — Cloudflare Pages cache + security headers.

**Modified:**
- `.gitignore` — drop Next.js / Vercel entries; rename section header.
- `wrangler.toml` — replace migration-era comment block.
- `build.sh` — drop Phase-4 narrative paragraph.
- `lib/CLAUDE.md` — fix function names (`getPostBySlug` → `getPostByPermalink`).
- `README.md` — full rewrite to TanStack Start + Velite + CSS Modules + Cloudflare Pages, in English.
- `vite.config.mts` — add inline plugin that emits `sitemap.xml` and `feed.xml`; extend `VeliteShape` with the fields the plugin reads.
- `app/routes/__root.tsx` — add RSS `<link rel="alternate">` to `head().links`.

**Deleted:**
- `static/robots.txt`
- `static/img/` (5 files; all duplicates of `public/images/` equivalents)
- `static/` (empty directory after the above)
- `scripts/optimize-images.js` (unreferenced)

---

## Task 1: Tidy `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verify `public/images/posts` is tracked, not ignored**

Run: `git ls-files public/images/posts | head -3`
Expected: at least 3 paths printed (Velite output is committed). If empty, stop and reassess — the spec assumed these are tracked.

- [ ] **Step 2: Edit `.gitignore`**

Replace the current contents with:

```gitignore
# Dependencies
node_modules/
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# Build artifacts
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env*.local
.env

# TypeScript
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output

# Temporary files
.tmp/
*.log
tmp/

# Image optimization backups
*.original

# Playwright
.playwright-mcp/

# Velite generated content layer
.velite/

# Git worktrees (used by superpowers subagent workflow)
.worktrees/

# Local Claude Code permission settings (per-machine, not project state)
.claude/

# Vite / TanStack Start build artifacts
.netlify/
app/routeTree.gen.ts
.tanstack/
```

Removed: `.next/`, `next-env.d.ts`, `out/`, `build/`, `/build`, `.vercel`, `public/images/posts`, `# Next.js` / `# Production` / `# Vercel` headings.

- [ ] **Step 3: Verify nothing newly ignored or unignored**

Run: `git status --ignored --short | head -40`
Expected: same set of ignored top-level dirs as before (`.velite/`, `.tanstack/`, `dist/`, `node_modules/`, etc.). No previously-tracked file appears as untracked.

Run: `git diff --name-only`
Expected: only `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: drop Next.js/Vercel entries from .gitignore"
```

---

## Task 2: Move robots.txt from `static/` to `public/`

**Files:**
- Create: `public/robots.txt`
- Delete: `static/robots.txt`

- [ ] **Step 1: Create `public/robots.txt`**

Contents:

```
User-agent: *
Allow: /
Sitemap: https://jaxx2104.info/sitemap.xml
```

- [ ] **Step 2: Delete `static/robots.txt`**

Run: `git rm static/robots.txt`
Expected: file staged for deletion.

- [ ] **Step 3: Verify the new file is reachable through the build**

Run: `rm -rf dist/ && pnpm build`
Expected: build succeeds.

Run: `cat dist/client/robots.txt`
Expected: matches the contents written in Step 1 verbatim.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt static/robots.txt
git commit -m "feat: serve robots.txt from public/ with sitemap pointer"
```

---

## Task 3: Delete `static/img/` after diff check

**Files:**
- Delete: `static/img/favicon.ico`
- Delete: `static/img/apple-touch-icon.png`
- Delete: `static/img/android-chrome-192x192.png`
- Delete: `static/img/android-chrome-512x512.png`
- Delete: `static/img/profile.jpg`
- Delete: `static/` (after the directory becomes empty)

- [ ] **Step 1: Diff each file against the `public/images/` equivalent**

Run:
```bash
for f in favicon.ico apple-touch-icon.png android-chrome-192x192.png android-chrome-512x512.png profile.jpg; do
  diff -q "static/img/$f" "public/images/$f" || echo "DIFFER: $f"
done
```
Expected: no `DIFFER:` lines and no diff output. If anything differs, stop, investigate, and update the plan before proceeding.

- [ ] **Step 2: Delete the duplicates**

Run:
```bash
git rm static/img/favicon.ico static/img/apple-touch-icon.png static/img/android-chrome-192x192.png static/img/android-chrome-512x512.png static/img/profile.jpg
```

- [ ] **Step 3: Remove the now-empty directories**

Run: `rmdir static/img static`
Expected: both succeed (no untracked files left).

If `rmdir` complains: run `ls -laR static/` to surface what is left, decide whether it is intentional, and update the plan accordingly.

- [ ] **Step 4: Verify build still succeeds**

Run: `pnpm build`
Expected: build succeeds. (No code references `static/`, so this is a sanity check.)

- [ ] **Step 5: Commit**

```bash
git add -A static/
git commit -m "chore: drop static/ — duplicates of public/images/ assets"
```

---

## Task 4: Delete unused `scripts/optimize-images.js`

**Files:**
- Delete: `scripts/optimize-images.js`

- [ ] **Step 1: Confirm zero references**

Run: `grep -RIn "optimize-images" --exclude-dir=node_modules --exclude-dir=.velite --exclude-dir=dist .`
Expected: no matches. If any reference is found, stop and reassess.

- [ ] **Step 2: Delete the file**

Run: `git rm scripts/optimize-images.js`

- [ ] **Step 3: Verify lint and type-check still pass**

Run: `pnpm test && pnpm lint:ci`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: drop unused scripts/optimize-images.js"
```

---

## Task 5: Replace stale comment block in `wrangler.toml`

**Files:**
- Modify: `wrangler.toml`

- [ ] **Step 1: Replace the file contents**

Write `wrangler.toml`:

```toml
# Cloudflare Pages config for the TanStack Start prerender output.
# `dist/client/` is produced by `pnpm build` (velite + vite build).

name = "blog"
pages_build_output_dir = "./dist/client/"
```

- [ ] **Step 2: Verify diff is comments-only**

Run: `git diff wrangler.toml`
Expected: only the comment lines change; the two config lines (`name`, `pages_build_output_dir`) are untouched.

- [ ] **Step 3: Commit**

```bash
git add wrangler.toml
git commit -m "docs: refresh wrangler.toml comment to reflect post-Phase-5 reality"
```

---

## Task 6: Trim `build.sh`

**Files:**
- Modify: `build.sh`

- [ ] **Step 1: Replace the file contents**

Write `build.sh`:

```bash
#!/bin/bash
# Cloudflare Pages dashboard build command is `bash build.sh`.
set -euo pipefail
pnpm build
```

- [ ] **Step 2: Verify the file is still executable**

Run: `ls -l build.sh`
Expected: mode contains `x` (executable bit preserved). If not: `chmod +x build.sh`.

- [ ] **Step 3: Verify it still runs**

Run: `bash -n build.sh`
Expected: no output (syntax OK).

- [ ] **Step 4: Commit**

```bash
git add build.sh
git commit -m "docs: drop migration-era narrative from build.sh"
```

---

## Task 7: Fix function names in `lib/CLAUDE.md`

**Files:**
- Modify: `lib/CLAUDE.md`

- [ ] **Step 1: Replace the `posts.ts` section**

In `lib/CLAUDE.md`, replace the block that currently reads:

```markdown
### `posts.ts` - Blog Post Data
ブログ記事の取得・処理を担当。

```typescript
// 主要な関数
getAllPosts()      // 全記事を日付降順で取得
getPostBySlug()    // スラッグから記事を取得
```

- `/content/posts/[slug]/index.md` から記事を読み込み
- gray-matter で frontmatter をパース
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照
```

with:

```markdown
### `posts.ts` - Blog Post Data
Velite の出力（`.velite/posts.ts`）をラップして、ルートから使いやすい形に整える。

```typescript
// 主要な関数
getAllPosts()           // 全記事を日付降順で PostMeta[] として返す
getPostByPermalink()    // permalink から記事本文付き PostFull を引く
getAllPermalinks()      // 日付降順の permalink 一覧（prerender 用）
```

- `.velite/posts.ts` をソース（`getAllPosts` / `getPostByPermalink` / `getAllPermalinks`）にしている
- frontmatter は Velite + Zod (`lib/content/schema.ts`) でパース済み
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照
- thumbnail は本文 HTML から最初の `<img src="/images/posts/...">` を抽出して `PostMeta.thumbnail` に詰める
```

- [ ] **Step 2: Verify against the source of truth**

Run: `grep -E '^export function' lib/posts.ts`
Expected: three lines, exactly `getAllPosts`, `getPostByPermalink`, `getAllPermalinks`. The CLAUDE.md text now lists the same three names.

- [ ] **Step 3: Commit**

```bash
git add lib/CLAUDE.md
git commit -m "docs: align lib/CLAUDE.md function names with lib/posts.ts"
```

---

## Task 8: Rewrite `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the file contents**

Write `README.md`:

````markdown
# jaxx2104.info Blog

Personal blog of [@jaxx2104](https://twitter.com/jaxx2104). Statically
generated with TanStack Start (Vite + React 19) and deployed to
Cloudflare Pages.

## Tech Stack

- **TanStack Start** (Vite + React 19) — file-based routing, prerendered to `dist/client/`
- **Velite + Zod** — Markdown content layer for `content/posts/**/index.md`
- **CSS Modules + CSS variables** — light/dark via `<html data-theme>`; single bundled CSS asset
- **shiki + rehype-pretty-code** — code syntax highlighting
- **Biome 2** — lint and format
- **textlint** — Japanese prose linting for blog posts
- **TypeScript 5.8** (strict mode), **pnpm 9**

## Development

```bash
pnpm install
pnpm dev          # Vite dev server (http://localhost:3000)
pnpm build        # velite build + vite build → dist/client/
pnpm start        # serve dist/ via vite preview (http://localhost:4173)
```

## Code Quality

```bash
pnpm test         # tsc -p (type check)
pnpm lint         # biome check --write
pnpm lint:ci      # biome ci (no fixes)
pnpm format       # biome format --write
pnpm lint:text    # textlint over content/**/index.md
pnpm lint:textfix # textlint --fix
```

## Project Structure

```
.
├── app/                # TanStack Start entrypoints + routes/
├── components/         # React components (features / layout / ui / icons)
├── content/posts/      # Markdown blog posts (Velite source)
├── lib/                # posts reader, ThemeContext
├── public/             # Static assets, manifest.json, _headers, robots.txt
├── styles/             # tokens.css + global.css
├── velite.config.ts    # Velite content layer config
├── vite.config.mts     # Vite + TanStack Start prerender config
├── wrangler.toml       # Cloudflare Pages output dir
└── build.sh            # Cloudflare Pages build entry
```

Per-directory `CLAUDE.md` files document the conventions inside each top-level directory.

## Writing a Post

Posts live in `content/posts/<slug>/index.md` with frontmatter:

```yaml
---
title: "Post title"
created_at: "2026-05-03T00:00:00.000Z"
updated_at: "2026-05-03T00:00:00.000Z"
path: "/2026/05/03/post-slug"
description: "Optional description for OGP / meta tags"
category: "tech"
tags:
  - typescript
---
```

Co-located images are referenced relatively (`![alt](./image.png)`) and rewritten by Velite to `/images/posts/<name>-<hash>.<ext>` at build time.

## Deployment

`pnpm build` produces `dist/client/`, which Cloudflare Pages serves directly. The dashboard build command is `bash build.sh`.

## License

MIT
````

- [ ] **Step 2: Sanity check links and commands**

Run: `grep -E '(pnpm |bash )' README.md`
Expected: every command listed actually exists in `package.json` (`dev`, `build`, `start`, `test`, `lint`, `lint:ci`, `format`, `lint:text`, `lint:textfix`) or is the documented Cloudflare Pages entry (`bash build.sh`).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the post-modernization stack"
```

---

## Task 9: Add `public/_headers`

**Files:**
- Create: `public/_headers`

- [ ] **Step 1: Create the file**

Write `public/_headers`:

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

- [ ] **Step 2: Verify it ships through the build**

Run: `rm -rf dist/ && pnpm build`
Expected: build succeeds.

Run: `cat dist/client/_headers`
Expected: matches Step 1 byte for byte.

- [ ] **Step 3: Commit**

```bash
git add public/_headers
git commit -m "feat: add Cloudflare Pages _headers for cache and basic security"
```

---

## Task 10: Sitemap + RSS plugin in `vite.config.mts`

**Files:**
- Modify: `vite.config.mts`

- [ ] **Step 1: Extend the Velite type and add the SEO helpers**

In `vite.config.mts`, change the existing import:

```ts
import { readFileSync } from "node:fs"
```

to:

```ts
import { readFileSync, writeFileSync } from "node:fs"
```

Then replace:

```ts
type VeliteShape = {
  permalink: string
}

function loadPermalinks(): string[] {
  const veliteFile = resolve(__dirname, ".velite/posts.json")
  try {
    const raw = readFileSync(veliteFile, "utf8")
    const posts = JSON.parse(raw) as VeliteShape[]
    return posts.map((p) => p.permalink)
  } catch (err) {
    console.warn(
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to home-only.`,
    )
    return []
  }
}
```

with:

```ts
type VelitePost = {
  permalink: string
  title: string
  excerpt: string
  created_at: string
  updated_at: string
}

function loadPosts(): VelitePost[] {
  const veliteFile = resolve(__dirname, ".velite/posts.json")
  try {
    const raw = readFileSync(veliteFile, "utf8")
    return JSON.parse(raw) as VelitePost[]
  } catch (err) {
    console.warn(
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to home-only.`,
    )
    return []
  }
}

const SITE_URL = "https://jaxx2104.info"
const SITE_TITLE = "jaxx2104.info"
const SITE_DESCRIPTION = "プログラムとバグが好き"
const RSS_ITEM_LIMIT = 30

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function normalizePermalink(p: string): string {
  return p.endsWith("/") ? p : `${p}/`
}

function buildSitemap(posts: VelitePost[]): string {
  const buildDate = new Date().toISOString()
  const urls: string[] = []
  urls.push(
    `  <url><loc>${SITE_URL}/</loc><lastmod>${buildDate}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  )
  urls.push(
    `  <url><loc>${SITE_URL}/profile/</loc><lastmod>${buildDate}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
  )
  for (const post of posts) {
    const loc = `${SITE_URL}${normalizePermalink(post.permalink)}`
    const lastmod = new Date(post.updated_at).toISOString()
    urls.push(
      `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    )
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`
}

function buildFeed(posts: VelitePost[]): string {
  const sorted = [...posts].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const latest = sorted.slice(0, RSS_ITEM_LIMIT)
  const lastBuildDate = new Date().toUTCString()
  const items = latest
    .map((post) => {
      const link = `${SITE_URL}${normalizePermalink(post.permalink)}`
      const pubDate = new Date(post.created_at).toUTCString()
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`
    })
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ja</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`
}

function seoArtifactsPlugin(posts: VelitePost[]): import("vite").Plugin {
  return {
    name: "blog-seo-artifacts",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir
      if (!dir || !dir.endsWith("client")) return
      writeFileSync(resolve(dir, "sitemap.xml"), buildSitemap(posts))
      writeFileSync(resolve(dir, "feed.xml"), buildFeed(posts))
    },
  }
}
```

- [ ] **Step 2: Wire the plugin and reuse the loader for prerender**

Replace the existing `const permalinks = loadPermalinks()` and the
`plugins: [...]` block with:

```ts
const posts = loadPosts()
const permalinks = posts.map((p) => p.permalink)
const allPages = ["/", "/profile/", ...permalinks]

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    cssCodeSplit: false,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "assets/[name]-[hash].js",
          },
        },
      },
    },
  },
  plugins: [
    tanstackStart({
      srcDirectory: "app",
      pages: allPages.map((path) => ({ path })),
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoSubfolderIndex: true,
        failOnError: true,
      },
    }),
    viteReact(),
    seoArtifactsPlugin(posts),
  ],
})
```

(The two existing comments about `cssCodeSplit: false` and `crawlLinks: false` should be preserved verbatim — keep them where they were.)

- [ ] **Step 3: Type-check passes**

Run: `pnpm test`
Expected: passes. If `VelitePost` field types fail (e.g. `created_at` typed as `Date` not `string` by Velite's JSON output), inspect `.velite/posts.json` and adjust the type:

Run: `node -e "console.log(typeof JSON.parse(require('fs').readFileSync('.velite/posts.json','utf8'))[0].created_at)"`
Expected: `string`. If it prints `object`, change `created_at` / `updated_at` types accordingly.

- [ ] **Step 4: Build and verify the artifacts**

Run: `rm -rf dist/ && pnpm build`
Expected: build succeeds.

Run: `ls dist/client/sitemap.xml dist/client/feed.xml`
Expected: both files exist.

Compute the expected URL count from the same source the plugin uses:

Run: `node -e "const p=JSON.parse(require('fs').readFileSync('.velite/posts.json','utf8')); console.log(p.length + 2)"`
Note the printed number as `URL_COUNT`.

Run: `grep -c '<url>' dist/client/sitemap.xml`
Expected: `URL_COUNT` (today: `111`).

Compute the expected item count:

Run: `node -e "const p=JSON.parse(require('fs').readFileSync('.velite/posts.json','utf8')); console.log(Math.min(p.length, 30))"`
Note the printed number as `ITEM_COUNT`.

Run: `grep -c '<item>' dist/client/feed.xml`
Expected: `ITEM_COUNT` (today: `30`).

Run: `xmllint --noout dist/client/sitemap.xml dist/client/feed.xml`
Expected: no output (both parse cleanly). `xmllint` ships with macOS by default. If it is unavailable on the implementer's machine, eyeball the first and last `<url>`/`<item>` and confirm well-formed open/close tags.

- [ ] **Step 5: Commit**

```bash
git add vite.config.mts
git commit -m "feat: emit sitemap.xml and feed.xml from velite content layer"
```

---

## Task 11: Add RSS `<link rel="alternate">` to `__root.tsx`

**Files:**
- Modify: `app/routes/__root.tsx`

- [ ] **Step 1: Add the link**

In `app/routes/__root.tsx`, inside `head().links` (currently ends with the Google Fonts stylesheet entry), append:

```ts
{
  rel: "alternate",
  type: "application/rss+xml",
  title: SITE_TITLE,
  href: "/feed.xml",
},
```

`SITE_TITLE` is already imported from `@/lib/site` at the top of the file — no new import needed.

- [ ] **Step 2: Type check and lint**

Run: `pnpm test && pnpm lint:ci`
Expected: both pass.

- [ ] **Step 3: Build and verify the link is emitted**

Run: `rm -rf dist/ && pnpm build`
Expected: build succeeds.

Run: `grep -l 'application/rss+xml' dist/client/index.html`
Expected: `dist/client/index.html` printed.

Run: `grep 'application/rss+xml' dist/client/index.html`
Expected: a `<link rel="alternate" type="application/rss+xml" ...>` tag pointing to `/feed.xml`.

- [ ] **Step 4: Commit**

```bash
git add app/routes/__root.tsx
git commit -m "feat: advertise RSS feed via <link rel=\"alternate\">"
```

---

## Task 12: Final verification across the whole branch

- [ ] **Step 1: Clean rebuild**

Run: `rm -rf dist/ .tanstack/ && pnpm build`
Expected: succeeds.

- [ ] **Step 2: Static-site checks**

Run:
```bash
ls dist/client/{robots.txt,_headers,sitemap.xml,feed.xml}
```
Expected: all four files listed, no errors.

Run:
```bash
node -e "const p=JSON.parse(require('fs').readFileSync('.velite/posts.json','utf8')); console.log('expected URLs:', p.length + 2, 'expected items:', Math.min(p.length, 30))"
grep -c '<url>' dist/client/sitemap.xml
grep -c '<item>' dist/client/feed.xml
xmllint --noout dist/client/sitemap.xml dist/client/feed.xml
```
Expected: counts match the values printed by the `node -e` line; `xmllint` produces no output.

- [ ] **Step 3: Type + lint pass for the full repo**

Run: `pnpm test && pnpm lint:ci`
Expected: both pass.

- [ ] **Step 4: Branch summary**

Run: `git log --oneline origin/main..HEAD`
Expected: roughly 11 commits (one per task that produced a commit; Task 12 has no commit). Spot-check that each commit message is in English and explains the why.

Run: `git diff --stat origin/main...HEAD`
Expected: changes confined to the files listed in the File Structure section above. No unrelated drift.

---

## Notes for the implementer

- **Order matters for Tasks 2 and 3**: Task 2 creates `public/robots.txt` and removes `static/robots.txt`. Task 3 then deletes the rest of `static/` and the directory itself. Doing them out of order is fine logically, but the commit story is cleaner this way.
- **No new dependencies**: every artifact is generated by code already in the repo or in stdlib (`node:fs`).
- **Velite output is the single source of truth** for the prerender list and for sitemap/RSS — both pipelines now share `loadPosts()` so they cannot disagree.
- **`SITE_*` constants** are intentionally inlined in `vite.config.mts` rather than imported from `@/lib/site` because the Vite config runs in Node before the path alias is resolved by the React build. Keep them in sync if `lib/site.ts` ever changes.
