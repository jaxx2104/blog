# jaxx2104.info Blog

Personal blog of [@jaxx2104](https://twitter.com/jaxx2104). Statically
generated with TanStack Start (Vite + React 19) and deployed to
Cloudflare Pages.

## Tech Stack

- **TanStack Start** (Vite 8 + React 19) — file-based routing, prerendered to `dist/client/`
- **Velite + Zod** — Markdown content layer for `content/posts/**/index.md`
- **CSS Modules + CSS variables** — light/dark via `<html data-theme>`; single bundled CSS asset
- **shiki + rehype-pretty-code** — code syntax highlighting
- **Biome 2** — lint and format
- **Vitest 4** — unit tests, plus component specs in jsdom
- **textlint** — Japanese prose linting for blog posts
- **TypeScript 5.9** (strict mode), **pnpm 9**

## Development

```bash
pnpm install
pnpm dev          # Vite dev server (http://localhost:3000)
pnpm build        # velite build + vite build → dist/client/
pnpm start        # serve dist/ via vite preview (http://localhost:4173)
```

## Code Quality

```bash
pnpm test         # vitest run
pnpm test:types   # tsc -p (type check)
pnpm lint         # biome check --write
pnpm lint:ci      # biome ci (no fixes)
pnpm format       # biome format --write
pnpm lint:text    # textlint over content/**/index.md
pnpm lint:textfix # textlint --fix
```

`pnpm test:types` needs `app/routeTree.gen.ts`, which `pnpm build` generates —
run a build first in a clean checkout.

## Project Structure

```
.
├── app/                # TanStack Start entrypoints + routes/
├── components/         # React components (features / layout / ui / icons)
├── content/posts/      # Markdown blog posts (Velite source)
├── data/               # Committed OGP link-card cache + unfetchable URL list
├── docs/               # Design notes and handover documents
├── lib/                # Content reader, pagination, SEO artifacts, ThemeContext
├── public/             # Static assets, manifest.json, _headers, robots.txt
├── scripts/            # Build and maintenance scripts (tsx)
├── styles/             # tokens.css + global.css
├── velite.config.ts    # Velite content layer config
├── vite.config.mts     # Vite + TanStack Start prerender config
├── wrangler.toml       # Cloudflare Pages output dir
└── build.sh            # Cloudflare Pages build entry
```

`public/content/` and `public/images/posts/` are written by the Velite build
and are not tracked.

Per-directory `CLAUDE.md` files document the conventions inside each top-level directory.

## Writing a Post

Posts live in `content/posts/<slug>/index.md` with frontmatter:

```yaml
---
title: "Post title"          # required
created_at: "2026-05-03T00:00:00.000Z"  # required, ISO 8601
updated_at: "2026-05-03T00:00:00.000Z"  # optional
path: "/post-slug"           # optional; defaults to the directory name
category: "tech"             # optional
tags:                        # optional
  - typescript
---
```

The meta description and OGP description come from the first ~120 characters
of the body, not from frontmatter — `lib/content/schema.ts` is the definition,
and any key it does not declare is dropped.

Co-located images are referenced relatively (`![alt](./image.png)`) and rewritten by Velite to `/images/posts/<name>-<hash>.<ext>` at build time.

## Deployment

`pnpm build` produces `dist/client/`, which Cloudflare Pages serves directly. The dashboard build command is `bash build.sh`.

## License

MIT
