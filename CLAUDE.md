# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev         # Start Next.js development server
pnpm build       # Build the application for production
pnpm start       # Start production server
pnpm export      # Export static site
```

### Code Quality
```bash
pnpm lint                # Run ESLint on TypeScript files
pnpm lint:text           # Check Japanese text in blog posts
pnpm lint:textfix        # Auto-fix Japanese text issues
pnpm test                # Run TypeScript type checking
pnpm format              # Format code with Prettier
```

## Architecture

This is a **Next.js 15** blog application. Key architectural points:

### Tech Stack
- **Next.js 15** with App Router (output: 'export' for static site generation)
- **TypeScript** with strict mode
- **styled-components** for CSS-in-JS
- **MDX** support for blog posts
- **pnpm** as package manager

### Directory Structure
- `/app` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with font configuration and providers
  - `page.tsx` - Homepage displaying blog post index
  - `[...slug]/page.tsx` - Dynamic catch-all route for blog posts
  - `profile/page.tsx` - Profile page

- `/components` - React components
  - `Article*.tsx` - Blog post components
  - `Navi*.tsx` - Navigation components
  - `Layout.tsx` - Main layout wrapper
  - `Providers.tsx` - Context providers

- `/lib` - Core utilities
  - `posts.ts` - Blog post data fetching and processing (reads from `/content/posts/*/index.md`)
  - `registry.tsx` - styled-components SSR support

- `/content/posts` - Blog posts in Markdown with frontmatter
  - Each post is a directory with `index.md` and optional images
  - Images are embedded as base64 data URIs during processing

- `/styles` - Global styles and styled-components themes

### Key Implementation Details

1. **Static Site Generation**: Configured as static export (`output: 'export'`) with `trailingSlash: true`

2. **Blog Post Processing**:
   - Posts stored in `/content/posts/[slug]/index.md`
   - Images in post directories are converted to base64 data URIs
   - Frontmatter supports: title, date, path, description, category, tags

3. **Styling**:
   - styled-components with SSR registry
   - Global styles in `/styles/global-style.ts`
   - Noto Sans JP font for Japanese text

4. **TypeScript Configuration**:
   - Strict mode enabled
   - Path alias `@/*` configured
   - Build errors temporarily ignored during migration