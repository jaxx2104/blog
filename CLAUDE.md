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
