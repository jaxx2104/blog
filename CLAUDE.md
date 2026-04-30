# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev         # Start Next.js development server
pnpm build       # Build the application for production
pnpm start       # Start production server
pnpm deploy      # Build for deployment
```

### Code Quality
```bash
pnpm lint                # Run ESLint on TypeScript files
pnpm lint:text           # Check Japanese text in blog posts
pnpm lint:textfix        # Auto-fix Japanese text issues
pnpm test                # Run TypeScript type checking
pnpm format              # Format code with Prettier
```

## Tech Stack

- **Next.js 15.5** with App Router (static site generation via `output: 'export'`)
- **TypeScript 5.8** with strict mode
- **styled-components 6.1** for CSS-in-JS with SSR support
- **MDX 3.1** for blog post content with syntax highlighting
- **pnpm 9.12** as package manager

## Directory Structure

| Directory | Description | See |
|-----------|-------------|-----|
| `/app` | Next.js App Router pages and layouts | `app/CLAUDE.md` |
| `/components` | React components (features, layout, ui, icons) | `components/CLAUDE.md` |
| `/lib` | Core utilities and data fetching | `lib/CLAUDE.md` |
| `/styles` | Global styles and theme configuration | `styles/CLAUDE.md` |
| `/content` | Blog posts in Markdown | `content/CLAUDE.md` |
| `/public` | Static assets (PWA manifest, icons) | - |

## Build Artifacts and Type Pitfalls

Hard-won lessons from the Velite migration (Phase 0). Read these before
touching `velite.config.ts`, the generated `.velite/` content layer, the
project tsconfig, or anything that runs in CI.

- Do not seal a value with `as const` if it is going to be passed as a
  function argument to an external SDK. SDK parameter types are almost
  always mutable (`Array<T>`, plain object), and the `readonly` form
  produced by `as const` fails to assign with TS2322. Velite's
  `MarkdownOptions.rehypePlugins` is the canonical example in this repo.
- For tools that emit a `.d.ts` next to their generated runtime (Velite,
  contentlayer, tRPC, zod-to-* and friends), add the source files those
  declarations re-import to tsconfig's `exclude`, not just remove them
  from `include`. Generated `import type` statements pull excluded
  sources back in transitively and re-surface the error you tried to
  suppress.
- If a tsconfig-included script depends on a build artifact (e.g.
  `scripts/verify-velite.ts` importing `.velite/index.js`), the CI
  pipeline must run the generator before tsc. Local runs hide this
  failure because the previous build's artifact is still on disk —
  reproduce the CI environment with `rm -rf <output-dir> && pnpm test`
  before pushing.
- When a young OSS dependency's documented behavior is unclear, grep
  `node_modules/<lib>/dist/` directly instead of arguing from README
  excerpts. Velite's `s.path()` defaulting to `removeIndex: true` only
  became unambiguous after reading the dist source; one upstream-doc
  disagreement during review cost extra round-trips.
