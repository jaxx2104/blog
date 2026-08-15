# Tech debt sweep — 2026-08-15

Follows `2026-08-14-next-improvements.md`, which is still worth reading for the
items left open at the bottom. Everything below was measured on this machine
with `OGP_OFFLINE=strict pnpm build`, not estimated.

## What moved

| | before | after |
|---|---|---|
| shared JS on the home page (gzip) | 126KB | 105KB |
| ↳ entry chunk | 104KB | 90KB |
| ↳ shared `posts` chunk | 22KB | gone |
| JS on an article page (gzip) | ~140KB | 113KB |
| entry chunk invalidated by a post edit | yes | no |
| unit tests | 87 | 121 |
| production dependencies | 15 | 6 |
| CI build reaching the network | yes | no |

## The entry-chunk problem, and why it took three attempts

`docs/2026-08-14-next-improvements.md` #4 asked whether the entry chunk's hash
moves when content changes. It did, and the cause was not `manualChunks`.

Rolldown writes the filename of an imported chunk into its importer. The entry
chunk statically imported the `posts` chunk, so a new post changed `posts`,
which changed the entry chunk holding React and TanStack — every returning
visitor re-downloaded 104KB gzip to read one new article.

Splitting content per page fixed the static import but not the problem:
`import.meta.glob` inlines a map of *every* matching file's emitted chunk name,
content hash included, into whichever chunk holds the glob. That map was in
`index-*.js`. Editing any post still changed the entry hash.

The fix is that content is no longer part of the module graph at all. Velite
writes `public/content/pages/<n>.json` and `public/content/posts/<id>.json`,
and `lib/posts.ts` fetches them by URL. The prerender has no server to fetch
from, so the server branch reads the same files from disk, behind
`import.meta.env.SSR` so the `node:` import compiles out of the client bundle.

Verified by editing one post and rebuilding: `index-CsukRJNk.js` before and
after. CI asserts it now ("Verify the entry chunk carries no content").

Trade-off: navigating between articles in the SPA now costs one fetch of a
~1KB gzip JSON instead of a JS chunk. First paint is unaffected — the
prerendered HTML already carries what it needs.

## Do not retry: splitting vendor chunks

Vite 8 bundles with rolldown. In this setup neither chunking API separates
node_modules:

- `manualChunks` returning `"vendor"` for react-dom / @tanstack / seroval
  returned that name 81 times during the client build. No vendor chunk was
  emitted.
- rolldown's own `advancedChunks.groups` with an equivalent regex matched
  nothing either.
- Renaming the group used for *project-local* modules did rename the emitted
  chunk, so the hook itself runs — the TanStack Start client entry simply keeps
  its dependencies.

`vite.config.mts` now configures no chunking at all, with that measurement in a
comment. If a future version fixes this, splitting React and TanStack into a
stable chunk would also stop component edits from invalidating them.

## Everything else in this sweep

- The theme toggle was a `<p onClick>` — not focusable, no role, so keyboard
  and screen reader users could not change the theme at all. It is a
  `<button aria-label>` now, and the glyph comes from CSS keyed on
  `[data-theme]` so the light-only prerender no longer shows dark visitors the
  wrong icon until hydration.
- CI builds with `OGP_OFFLINE=strict`. It was reaching six third-party sites on
  every run, at up to a 10s timeout each, because failures are deliberately not
  cached. Those six are recorded in `data/ogp-unfetchable.json`; successful
  entries now carry `fetchedAt` and are re-checked after 90 days by builds that
  have the network.
- `@fortawesome/*` (3 packages) was dead code: `icon.tsx` was reachable only
  from `icon-box.tsx`, which nothing imported. Build-only dependencies
  (velite plugins, shiki, sharp's friends, gray-matter) moved to
  devDependencies, leaving 6 production dependencies.
- Component specs exist now (jsdom + testing-library), covering the nav menu
  and the pager — including the a11y properties above, so the regression
  cannot come back silently.
- `public/_headers` sets a CSP. `script-src` keeps `'unsafe-inline'` (the theme
  bootstrap, the font loader and TanStack's hydration payload are all inline
  and change every build), but `frame-ancestors` / `object-src` / `base-uri` /
  `form-action` are closed regardless.
- `rehype-link-card.ts` was casting text nodes to elements and reading
  `.tagName` off them; rewritten with real narrowing and a spec covering which
  paragraphs become cards.
- The feed advertises itself with `atom:link rel="self"`.
- Docs: three claims were already stale (`app/client.tsx`, `app/ssr.tsx` and
  `components/ui/meta.tsx` do not exist; `description` frontmatter is not in
  the schema and never reached a meta tag). All of them were file listings or
  field enumerations — the parts of a document that rot. The CLAUDE.md set was
  cut from 378 to ~260 lines by dropping what `ls` or the schema already
  answers and keeping the reasons.

## Still open

From the previous handover, unchanged and still worth doing:

- **#2 LCP is 97% render delay.** Not re-measured here; needs a Lighthouse
  trace against a deploy preview.
- **#3 CLS 0.03 from the async Japanese font.** Unchanged. `size-adjust` on a
  fallback `@font-face` is the cheap end; self-hosting a subset is the thorough
  one.
- **#6 No responsive images.** `lib/rehype-image.ts` adds intrinsic dimensions
  but no `srcset`. Sources are capped at 1600px, so a phone still downloads
  roughly four times the pixels it can show. Velite can emit multiple widths
  and the plugin already resolves source files through velite's asset map.

New, and left alone deliberately:

- The prerendered HTML contains three NUL bytes, from TanStack Router
  serialising its route IDs. HTML parsers replace them with U+FFFD and browsers
  do not care, but tools do: it is why the CI assertions need `grep -a`.
  Upstream's to fix.
- 35 directories named `C:\Users\jaxx2\AppData\Local\lighthouse.*`, 146MB in
  total, are sitting in the repository root — Chrome profiles from running the
  Lighthouse MCP server under WSL. They are gitignored now, but deleting them
  needs a shell (`find . -maxdepth 1 -name 'C:*' -type d -exec rm -rf {} +`).
