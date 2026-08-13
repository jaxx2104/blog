# Next improvements — handover, 2026-08-14

Written at the end of the session that shipped #746, #747 and #748. Everything
below was measured against production (`https://jaxx2104.info`) after those
merged, not estimated. Read `CLAUDE.md` first — the build-artifact pitfalls
section there covers the traps this codebase actually hits.

## Where things stand

| | before | now |
|---|---|---|
| shared JS on every page (gzip) | 216KB | 126KB |
| ↳ `posts` chunk | 116KB | 22KB |
| home page HTML | 100KB | 29KB |
| `.velite/posts.json` | 595KB | 81KB |
| images served | 18MB | 4.9MB |
| `<img>` with intrinsic dimensions | 0/128 | 88/109 (rest are remote) |
| render-blocking font requests | 3 | 0 |
| meta descriptions with newlines | 86/117 | 0 |
| unit tests | 0 | 68 |
| textlint violations | 161 | 0 |

Lighthouse (mobile, production): Accessibility 95, Best Practices 100, SEO 100.
LCP 452ms (TTFB 13ms + render delay 438ms), CLS 0.03.

## Improvements worth making, most valuable first

### 1. Colour contrast — 67 elements fail WCAG AA

The only Lighthouse audit still failing. All 67 come from four foreground
colours on the `#ea2552` brand background:

| foreground | ratio | needs | where |
|---|---|---|---|
| `#f06181` | 1.37 | 4.5 | pager's disabled PREV/NEXT |
| `#fabbc8` | 2.66 | 4.5 | tile excerpt, category, date, footer meta |
| `#fbc7d2` | 2.90 | 4.5 | nav menu items |
| `#fff0f2` | 3.88 | 4.5 | logo h1, pager links, footer wordmark |

Fixable in `styles/tokens.css` — these are a handful of variables, not 67
separate decisions. The design intent is a tonal pink scale, so darkening the
background or lightening the tints both work; check both themes
(`<html data-theme>`) after changing anything.

Re-measure with the Lighthouse MCP rather than by eye — the failures are
concentrated at 13px, where the eye is a poor judge.

### 2. LCP is 97% render delay

452ms total, of which TTFB is 13ms and render delay is 438ms. Delivery is not
the problem; something between response and paint is. Worth a trace with
`performance_analyze_insight` on `LCPBreakdown` before touching anything —
the likely candidates are the async Japanese font (see #3) and hydration, and
guessing between them wastes a cycle.

Already Good by Core Web Vitals thresholds, so this is polish, not a fix.

### 3. CLS 0.03 comes entirely from the async Japanese font

Confirmed via `CLSCulprits`: a single shift cluster at 479ms, caused by 26
Noto Serif JP subset woff2 files arriving one after another and reflowing the
text.

This is the trade-off taken in #746 — the font was moved off the
render-blocking path, which costs a FOUT. Options, roughly in order of effort:

- `size-adjust` / `ascent-override` / `descent-override` on a `@font-face`
  for the fallback, so the substituted metrics match and the swap does not
  move anything
- self-host a subset of Noto Serif JP (the two latin faces are already
  self-hosted in `public/fonts/`; the Japanese one was left on Google Fonts
  because a full subset does not fit the 1MB budget that was set)

0.03 is well inside Good, so weigh this against the risk of regressing the
render-blocking work.

### 4. `manualChunks` does not produce the `vendor` chunk it asks for

`vite.config.mts` routes `react-dom`, `@tanstack/*` and `seroval` to a
`vendor` chunk, but no `vendor-*.js` is emitted and `react-dom` is present in
`index-*.js` (333KB, 104KB gzipped). Either the TanStack Start plugin
overrides `build.rollupOptions.output`, or the environments API means the
top-level `build` config is not reaching the client build.

Splitting does not reduce first-load bytes — both chunks load either way. It
matters for repeat visits: if the entry chunk's hash changes whenever content
changes, every visitor re-downloads 104KB for a post that touched none of it.

Verify the premise first: build twice from an unchanged tree and compare the
`index-*.js` hash. If it is stable, this is low value; if it moves, it is the
highest-value item in this list.

### 5. The `posts` chunk (22KB gzip) loads on every page

It holds the metadata for all 117 posts. The home and `/page/N/` routes need
it. An article page needs exactly one entry. Splitting it the way bodies were
split in #746 would take ~20KB off every article page.

Weigh against SPA navigation: leaving an article for the index would then
need a fetch. Given the prerendered HTML already carries what the first paint
needs, that is probably acceptable, but it is a real trade-off, not a free win.

### 6. No responsive images

`lib/rehype-image.ts` adds intrinsic `width`/`height` but no `srcset`/`sizes`.
Sources are capped at 1600px for 2x DPR, so a phone downloads roughly four
times the pixels it can show. Velite can emit multiple widths; the plugin
already resolves source files through velite's in-memory asset map, so the
hook is there.

### 7. Smaller items

- `public/_headers` sets no Content-Security-Policy. The site loads Google
  Fonts CSS and gstatic woff2, so a policy is writable but not trivial.
- Biome reports 2 infos asking for `biome migrate` (config written against
  schema 2.4.14, running 2.5.6). Cosmetic, but it is noise on every run.
- `@tanstack/router-plugin` wants `@tanstack/react-router@^1.170.18`; 1.170.25
  is installed but the plugin's own pin is stale. Harmless today.
- `textlint`'s `ai-writing` preset emits 8 infos. They are suggestions, not
  errors, and CI does not gate on them.

## Decided — do not re-open

- The 17 orphaned images under Scrapbox-imported posts (~1.28MB) stay as they
  are. Pointing those posts at the local copies would fix the remaining CLS
  and shrink them further, but it means re-hosting Amazon product shots and
  other blogs' figures. jaxx decided against it on 2026-08-14.
- `ja-space-around-link` is off in `.textlintrc` deliberately. It cannot tell
  a markdown link from a bare URL, so enforcing it turns
  `Docker 入れる https://www.docker.com/` into `入れるhttps://...`. Spacing
  around links is the author's call. Rationale is in `content/CLAUDE.md`.
- Article bodies appear twice in a prerendered page (rendered DOM plus the
  serialised loader payload). Measured: an article is 11KB raw but 3.7KB
  gzipped, because gzip collapses the repetition. Not worth chasing.

## Things that will bite you

`CLAUDE.md` has the full list. The three that cost the most time this session:

- Velite's `output.clean` runs between parsing and writing, and only covers
  the data directory. Side files written during `transform` are deleted;
  emitted assets are never cleaned up.
- Velite bundles `velite.config.ts` into a temp file before importing it, so
  `import.meta.url` in anything it pulls in points outside the project. One
  attempt wrote 117 files into the repo's parent directory.
- TanStack Start prerenders *after* vite's `closeBundle`. No plugin hook sees
  the prerendered output — that is why `scripts/promote-404.ts` runs from the
  build script instead.

And the incident worth remembering: Cloudflare Pages falls back to SPA
behaviour when `404.html` is absent, answering any unmatched path — including
`/assets/*` — with `index.html` and a 200. Combined with the `immutable`
header in `public/_headers`, one request in the gap between a deploy
reporting success and its assets propagating pinned a broken stylesheet in
the edge cache for a year and took production's styling down. #747 fixed the
cause; CI now fails if `404.html` is missing. Do not remove that guard.

## Verifying work

```bash
pnpm build        # velite + vite prerender + promote-404
pnpm test         # 68 unit tests
pnpm test:types   # tsc
pnpm lint:ci      # biome
pnpm lint:text    # textlint
```

CI additionally asserts that the `posts` chunk stays under 150KB, that
`posts.json` has no `body` field, and that `404.html` exists. Those three
guard the work in #746 and #747 — if one starts failing, the regression is
real, not a flaky check.

For anything performance- or accessibility-related, measure against the
Cloudflare Pages preview URL on the PR rather than production, and wait for
the deploy to settle before requesting assets directly (see the incident
above).
