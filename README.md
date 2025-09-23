# jaxx2104.info Blog

A personal blog built with Next.js 15, TypeScript, and styled-components.

## Features

- Static site generation with Next.js 15
- TypeScript for type safety
- styled-components for CSS-in-JS
- MDX support for blog posts
- Responsive design
- Dark mode support

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: styled-components
- **Package Manager**: pnpm
- **Font**: Noto Sans JP

## Development

### Install dependencies
```bash
pnpm install
```

### Start development server
```bash
pnpm dev
```

### Build for production
```bash
pnpm build
```

### Start production server
```bash
pnpm start
```

### Deploy (static export)
```bash
pnpm deploy
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm export` - Export as static site
- `pnpm deploy` - Build and export for deployment
- `pnpm lint` - Run ESLint
- `pnpm lint:text` - Check Japanese text in blog posts
- `pnpm lint:textfix` - Auto-fix Japanese text issues
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run TypeScript type checking

## Project Structure

```
.
├── app/                  # Next.js App Router pages
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Homepage
│   ├── [...slug]/       # Blog post pages
│   └── profile/         # Profile page
├── components/          # React components
├── content/            # Blog posts (Markdown)
│   └── posts/
├── lib/                # Utility functions
├── public/             # Static assets
└── styles/             # Global styles
```

## Writing Blog Posts

Blog posts are stored in `/content/posts/` as Markdown files with frontmatter.

### Post Structure
```
content/posts/
└── my-post-slug/
    ├── index.md    # Post content
    └── image.png   # Post images
```

### Frontmatter Example
```yaml
---
title: "Post Title"
created_at: "2024-01-01"
updated_at: "2024-01-01"
path: "/my-post-slug"
category: "tech"
tags: ["nextjs", "typescript"]
---
```

## License

MIT
