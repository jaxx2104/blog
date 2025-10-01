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

## Architecture

This is a **Next.js 15** blog application built with modern web technologies. Key architectural points:

### Tech Stack
- **Next.js 15.5** with App Router (static site generation via `output: 'export'`)
- **TypeScript 5.8** with strict mode
- **styled-components 6.1** for CSS-in-JS with SSR support
- **MDX 3.1** for blog post content with syntax highlighting
- **rehype-pretty-code + shiki** for code syntax highlighting
- **pnpm 9.12** as package manager

### Directory Structure

#### `/app` - Next.js App Router pages and layouts
- `layout.tsx` - Root layout with Noto Sans JP font configuration and providers
- `page.tsx` - Homepage displaying blog post index
- `[...slug]/page.tsx` - Dynamic catch-all route for blog posts (MDX rendering)
- `profile/page.tsx` - Profile page

#### `/components` - React components
- `features/` - Feature-specific components
  - `article/` - Blog post display components
  - `profile/` - Profile page components
- `layout/` - Layout components
  - `navi-logo.tsx` - Logo component
  - `navi-menu.tsx` - Navigation menu
- `ui/` - Reusable UI components
  - `display.tsx` - Display utilities
  - `meta.tsx` - Meta tags component
  - `section.tsx` - Section wrapper
  - `slide-image.tsx` - Image slider
  - `tile-grid.tsx` - Responsive grid layout
- `icons/` - Icon components (FontAwesome integration)
- `Providers.tsx` - Context providers (theme, styled-components registry)

#### `/lib` - Core utilities
- `posts.ts` - Blog post data fetching and processing (reads from `/content/posts/*/index.md`)
- `image-utils.ts` - Image processing utilities (base64 conversion)
- `registry.tsx` - styled-components SSR support
- `ThemeContext.tsx` - Theme context for dark/light mode
- `useDarkMode.ts` - Dark mode hook
- `storage.ts` - Local storage utilities

#### `/content/posts` - Blog posts in Markdown
- Each post is a directory with `index.md` and optional images
- Images are embedded as base64 data URIs during processing
- Frontmatter schema: title, date, path, description, category, tags

#### `/styles` - Global styles and theme configuration
- `global-style.ts` - Global CSS styles
- `theme.ts` - Theme definition (colors, typography, etc.)

#### `/public` - Static assets
- PWA manifest and icons
- Favicon and app icons

### Key Implementation Details

1. **Static Site Generation**:
   - Configured as static export (`output: 'export'`) with `trailingSlash: true`
   - Images are unoptimized for static export compatibility
   - Build errors temporarily ignored during migration (`ignoreBuildErrors: true`)

2. **Blog Post Processing**:
   - Posts stored in `/content/posts/[slug]/index.md`
   - Images in post directories are converted to base64 data URIs via `image-utils.ts`
   - MDX rendering with rehype-pretty-code for syntax highlighting
   - Frontmatter parsing with gray-matter

3. **Styling System**:
   - styled-components with compiler support and SSR registry
   - Dark/light theme support via ThemeContext
   - Global styles in `/styles/global-style.ts`
   - Noto Sans JP font for Japanese text (defined in `app/layout.tsx`)
   - Modern normalize CSS (`modern-normalize`)

4. **TypeScript Configuration**:
   - Strict mode enabled
   - Path alias `@/*` configured for imports
   - Build errors temporarily ignored during Next.js migration
   - ESLint configured with Next.js, React, and TypeScript rules

5. **Dependencies**:
   - **UI**: React 18.3, FontAwesome icons, react-share for social sharing
   - **Content**: MDX, remark/rehype ecosystem, shiki for syntax highlighting
   - **Utilities**: date-fns for date formatting, localforage for storage
   - **Dev Tools**: ESLint, Prettier, textlint for Japanese text linting