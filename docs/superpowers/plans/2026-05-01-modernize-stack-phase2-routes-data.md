# Stack Modernization Phase 2: ルートとデータ層の移植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 で立ち上げた TanStack Start ひな型（`app/routes/__root.tsx` + stub `index.tsx`）に、Velite 出力を読む loader と OGP 付きの `head()` を結線し、`/`（記事一覧）・`/profile/`・`/<permalink>/`（記事詳細）の 3 系統が prerender で全件出力される状態にする。Cloudflare Pages Deploy Preview 上で、現行 Next.js 本番（`out/`）と「件数・OGP・本文 HTML が同等」と言える Vite 成果物（`dist/client/`）を表示する。

**Architecture:**
1. `.velite/posts.json` を一次データソースに据え、`lib/posts.ts` を Velite 出力ベースの薄いセレクタに作り変える。既存の filesystem-based 実装は `lib/posts-legacy.ts` にリネームし、`scripts/verify-velite.ts` の cross-check 専用にする（Phase 4 で削除）。
2. ルーティングは spec section 5 の通り、`/` と `/profile/` は具体ルート、`/<slug>/` は splat ルート `app/routes/$.tsx` に固定。loader は **`permalink` 完全一致**で記事を引く（Phase 1 で確定済みの設計）。
3. `vite.config.mts` の TanStack Start プラグインに `pages: [...全permalink]` を渡し、`crawlLinks: true` のリンク追跡に依存しない決定論的な prerender 出力にする（リンク漏れで一部記事が 404 になる事故を防ぐ）。
4. styled-components はランタイム実行のまま残す（SSR style collection は Phase 3 で CSS Modules に置換するため Phase 2 では FOUC を許容）。Provider と GlobalStyle は `__root.tsx` の document 内に直接マウントする。
5. `next/link` を使う 4 コンポーネント（`ArticleTile`、`ArticleInfo`、`NaviMenu`、`NaviLogo`）を `@tanstack/react-router` の `Link` に切り替える。Next.js 専用ファイル（`app/page.tsx`、`app/[...slug]/`、`app/profile/`、`app/layout.tsx`、`lib/registry.tsx`）は本フェーズで削除する。Cloudflare Pages の本番ビルドは `build.sh` が `CF_PAGES_BRANCH == "main"` のときだけ `pnpm build` を呼ぶため、本ブランチ側で Next.js コードを消しても main の本番には影響しない。
6. `head()` API で OGP / Twitter Card / canonical / icons / manifest を出す。記事 OGP 画像は「本文 HTML 中の最初の `/images/posts/...` を使い、無ければ `/images/ogp-default.png`」という現行ロジックを Velite 出力 `body` 上で再現する。

**Tech Stack:** @tanstack/react-router v1（routeTree、Link、createFileRoute）、@tanstack/react-start v1（prerender）、Velite v0.3、styled-components v6（ランタイムのみ・SSR 収集なし）、Vite 8 / rolldown

---

## File Structure

### Create
- `lib/posts.ts` — Velite 出力（`.velite/posts.json` または `.velite/index.js`）から `getAllPosts()` / `getPostByPermalink()` / `extractThumbnail()` を提供するセレクタ層。型は Velite の `Post` を再エクスポート
- `lib/posts-legacy.ts` — **既存 `lib/posts.ts` の内容をそのまま移したもの**。`scripts/verify-velite.ts` 専用。Phase 4 で削除予定
- `lib/site.ts` — サイトメタ定数（`SITE_URL`、`SITE_TITLE`、`SITE_DESCRIPTION`、`SITE_AUTHOR`、`SITE_TWITTER`、`DEFAULT_OGP_IMAGE`）。既存 `app/[...slug]/page.tsx` で inline されていた `siteMeta` の置換先
- `app/routes/profile.tsx` — `/profile/` ルート
- `app/routes/$.tsx` — splat ルート（`/<permalink>/`）。`loader` で permalink 解決、`notFound()` 実装、`Article` コンポーネントを描画
- `lib/router-link.tsx` — `@tanstack/react-router` の `Link` を `next/link` 互換のシグネチャ（`href` プロップ）でラップする超薄いシム。**目的は import path 変更を最小化すること**

### Modify
- `app/routes/__root.tsx` — `Providers`（ThemeProvider）と `GlobalStyles` を document 内にマウント、`<head>` に Google Fonts の `<link>` と icons / manifest を追加、`head()` でサイト全体のデフォルト meta を返す
- `app/routes/index.tsx` — stub を削除し、`loader` で `getAllPosts()` を呼んで `TileGrid` + `ArticleTile` を描画
- `vite.config.mts` — TanStack Start プラグインに `pages` 配列を渡して全 permalink を prerender 対象に明示注入
- `package.json` — `scripts.dev` を `vite dev` に、`scripts.build` を `pnpm velite:build && vite build` にスイッチ。旧 Next.js 用は `scripts.dev:next` / `scripts.build:next` に退避（Phase 4 で削除）。`scripts.dev:vite` / `scripts.build:vite` は重複になるので削除
- `.github/workflows/test.yml` — Phase 1 で入れた `'Phase 1 stub'` の grep を削除し、`/php-replace-lf/index.html`（最初の Velite 記事の permalink。実在することを Velite 出力で確認済み）の存在と OGP meta タグを smoke check
- `components/features/article/article-tile.tsx` — `import Link from "next/link"` を `import Link from "@/lib/router-link"` に置換
- `components/features/article/article-info.tsx` — 同上
- `components/layout/navi-menu.tsx` — 同上
- `components/layout/navi-logo.tsx` — 同上
- `components/ui/meta.tsx` — `next/head` 依存を削除、もしくはファイル自体を削除（呼び出し元は Next.js の `app/profile/page.tsx` のみ。本フェーズで Next.js page を削除するので Meta も同時削除でよい）
- `scripts/verify-velite.ts` — `import { getAllPosts } from "../lib/posts"` を `from "../lib/posts-legacy"` に変更
- `docs/superpowers/specs/2026-05-01-modernize-stack-design.md` — Phase 2 を完了マーキング、残課題（OGP 画像生成パイプライン）を解消ステータスに更新

### Delete
- `app/page.tsx` — `app/routes/index.tsx` に置換
- `app/[...slug]/page.tsx`、`app/[...slug]/` ディレクトリ — `app/routes/$.tsx` に置換
- `app/profile/page.tsx`、`app/profile/` ディレクトリ — `app/routes/profile.tsx` に置換
- `app/layout.tsx` — `app/routes/__root.tsx` に置換
- `lib/registry.tsx` — Next.js 専用の styled-components SSR レジストリ。本フェーズで Next.js page を消すので不要に
- `components/Providers.tsx` — `ThemeProvider` と `GlobalStyles` のラッパー。Phase 2 では `__root.tsx` に直接書くため不要（GlobalStyle import を 1 回減らすほうが SSR の事故が減る）
- `components/ui/meta.tsx` — 上記参照

### Untouched
- `velite.config.ts`、`lib/content/**`、`scripts/inspect-paths.ts` — Phase 0 で固めた状態を維持
- `app/router.tsx` — Phase 1 で定義した `createRouter` / `getRouter` をそのまま使う
- `components/features/article/article.tsx`、`components/features/profile/**`、`components/layout/footer.tsx`、`components/ui/**`（meta.tsx を除く）、`components/icons/**` — styled-components のままで Phase 3 まで触らない
- `lib/ThemeContext.tsx`、`lib/useDarkMode.ts`、`lib/storage.ts`、`styles/theme.ts`、`styles/global-style.ts` — Phase 3 で CSS Modules + CSS variables 化するまで温存
- `lib/image-utils.ts` — Phase 4 で削除。Phase 2 の新 `lib/posts.ts` は base64 化を行わず、Velite が `public/images/posts/` に書き出した URL をそのまま使う
- `lib/rehype-link-card.ts`、`lib/link-card.ts` — Velite が `markdownConfig` 経由で参照済み。本フェーズで触る必要なし
- `next.config.mjs`、`next-env.d.ts` — Phase 4 で削除。Phase 2 では Next.js コードを消したあとも残しておく（CI で `pnpm test` が通るかは tsconfig の `include` だけで決まり、`next.config.mjs` 自体は無害）

---

## Conventions

- ブランチは Phase 1 のもの (`modernize-stack-phase1-tanstack-skeleton`) を**そのまま継続**する。spec section 9 改訂注に従い、Phase 1 単独 merge はしない方針。Phase 2 完了時点で再度 merge 可否を判定する
- 全コミットは Phase 1 の worktree (`.worktrees/modernize-stack-phase1-tanstack-skeleton`) で作業する。本 plan ファイルを Phase 1 ブランチに取り込みたい場合は `git cherry-pick` か `git merge --no-ff origin/main` 後に commit
- Cloudflare Pages の `build.sh` は触らない（Phase 1 で `main` → `pnpm build`、それ以外 → `pnpm build:vite` の分岐が確立済み）
- 本フェーズ中も `pnpm test`（tsc）と `pnpm lint:ci`（biome）を毎タスクの最後に通す。Next.js 用ファイル削除によって `next/link` などの import エラーが残るとここで検出される
- Velite の出力ファイル（`.velite/posts.json` / `.velite/index.js`）が無い状態では vite.config.mts の `pages` 注入も `lib/posts.ts` の import も死ぬ。**`pnpm velite:build` が常に先**になるよう scripts 順序を維持する（Phase 0 の build artifact pitfall 通り）
- 既存 `<Link href="/profile">` 等のパスは末尾スラッシュを **付けない**まま。TanStack Router 側が `autoSubfolderIndex: true` で `/profile/` への変換を吸収する。ただし spec section 5 の URL 互換性方針（`/<slug>/` 末尾スラッシュ付き）に違反しないよう、最終 prerender HTML が `/profile/index.html` で出ることを Task 13 の smoke で確認

---

## Revisions（実装中に確定した方針差分）

このセクションは**実装後に追記する**ためのプレースホルダ。Phase 1 plan と同じ運用で、当初案と現実が乖離した点を記録する。空欄でコミットを始め、Task 単位で気付いたら追記する。

| 当初 plan の前提 | 実装後の現実 | 確定理由 |
|------|------|------|
| (空欄。Task 単位で追記) |  |  |

---

## Task 1: Phase 1 ブランチでの作業準備

**Files:**
- Modify: 作業ディレクトリ確認のみ

- [ ] **Step 1: Phase 1 worktree に入り、最新を取り込む**

```bash
cd /Users/jaxx/repos/blog/.worktrees/modernize-stack-phase1-tanstack-skeleton
git status
git fetch -p origin
```

Expected: ブランチが `modernize-stack-phase1-tanstack-skeleton`、未 commit 変更が無い、`origin/main` の最新が取れる

- [ ] **Step 2: main の進捗を Phase 1 ブランチに取り込む**

main 側に Phase 1 完了後の修正（例: `5c9495e ci: add build.sh as cloudflare pages entry`）が入っている可能性がある。conflict が出たら個別解決、出なければ fast-forward。

```bash
git merge --no-ff origin/main -m "merge: bring main into phase 1 branch before phase 2"
```

Expected: 競合無くマージ完了。`build.sh` などが Phase 1 ブランチに入る（既に入っていればスキップされる）

競合した場合: ファイルごとに調査し、Phase 1 で追加した版を優先（spec の Phase 1 完了マーク等は Phase 1 側が真正）。

- [ ] **Step 3: Velite ビルドが現状で通ることを確認**

```bash
pnpm install --frozen-lockfile
pnpm velite:build
ls .velite/posts.json
```

Expected: 109 件分が出力される（Phase 1 Task 1 で content gap 解消済み）。

- [ ] **Step 4: 既存 Next.js ビルドと Vite ビルドが両方通ることを確認**

```bash
pnpm test
pnpm build:vite
ls dist/client/index.html
```

Expected: 全部 exit 0。`dist/client/index.html` には Phase 1 の stub 文言 `Phase 1 stub` が含まれる（後続 Task で消す）

- [ ] **Step 5: 作業開始のチェックポイントコミット（不要であればスキップ）**

merge コミットだけが付く想定なら追加コミットは不要。merge をスキップしたなら Step 6 の commit は無し。

---

## Task 2: 既存 `lib/posts.ts` を `lib/posts-legacy.ts` にリネーム

新 `lib/posts.ts` を Velite 出力ベースで作り直す前段。既存実装を **完全コピー**で `lib/posts-legacy.ts` に退避し、`scripts/verify-velite.ts` の参照だけ書き換える。これにより Phase 4 までの cross-check が壊れない。

**Files:**
- Create: `lib/posts-legacy.ts`
- Modify: `scripts/verify-velite.ts`

- [ ] **Step 1: 既存 `lib/posts.ts` をコピーして `lib/posts-legacy.ts` を作る**

```bash
cp lib/posts.ts lib/posts-legacy.ts
```

- [ ] **Step 2: `lib/posts-legacy.ts` の冒頭にコメントを追加**

ファイル冒頭の `import` 群の上に以下を追加:

```typescript
// LEGACY: Filesystem-backed posts reader, kept solely so
// scripts/verify-velite.ts can cross-check Velite output during the
// stack-modernization migration. The runtime app uses Velite via
// lib/posts.ts. Delete this file together with the cross-check script
// in Phase 4 (see docs/superpowers/specs/2026-05-01-modernize-stack-design.md).
```

- [ ] **Step 3: `scripts/verify-velite.ts` の import を書き換え**

`import { getAllPosts } from "../lib/posts"` を以下に置換:

```typescript
import { getAllPosts } from "../lib/posts-legacy"
```

- [ ] **Step 4: cross-check が通ることを確認**

```bash
pnpm velite:build
pnpm verify:velite
```

Expected: `Velite posts: 109` / `Legacy posts: 109` / `OK: counts and titles match`

- [ ] **Step 5: 旧 `lib/posts.ts` はまだ残しておく**

新実装は Task 3 で同じファイル名に上書きする。両方残すとビルドが重複定義で死ぬ。Task 3 まで temporal な状態で進める。

- [ ] **Step 6: Commit**

```bash
git add lib/posts-legacy.ts scripts/verify-velite.ts
git commit -m "refactor(content): split legacy posts reader to lib/posts-legacy.ts"
```

---

## Task 3: Velite 出力ベースの新 `lib/posts.ts` を作る

新 `lib/posts.ts` は `.velite/index.js` から `posts` を読み、既存 `app/[...slug]/page.tsx` / `app/page.tsx` が要求していた API（`getAllPosts`、`getPostByPath`、`PostData` 型相当）を **TanStack route loader 用に再構築**する。`getPostByPath` は `permalink` キーで lookup する版に変える（旧版の `path` 比較と等価。`permalink` は `lib/content/schema.ts` の transform で `data.path ?? "/" + tail + "/"` として算出済み）。

サムネイル抽出も新規追加: Velite の `body` HTML から最初の `<img src="/images/posts/...">` を正規表現で取り出して `thumbnail` フィールドに乗せる。Velite 出力には現状 `thumbnail` が無いため Velite schema を変えるか、ここで派生させるかの 2 択になるが、**ここで派生させる**ほうが Velite の純粋な出力責務を保てる。

**Files:**
- Modify: `lib/posts.ts` （Task 2 で legacy をコピー済みなので、本タスクで完全に内容を入れ替える）

- [ ] **Step 1: `lib/posts.ts` の内容を以下に置換**

```typescript
import { posts as velitePosts, type Post } from "../.velite"

export type PostMeta = Pick<
  Post,
  "title" | "created_at" | "updated_at" | "category" | "tags" | "excerpt"
> & {
  permalink: string
  slug: string
  thumbnail?: string
}

export type PostFull = PostMeta & {
  body: string
}

const THUMBNAIL_RE = /<img[^>]+src="(\/images\/posts\/[^"]+)"/

function deriveThumbnail(body: string): string | undefined {
  const match = body.match(THUMBNAIL_RE)
  return match?.[1]
}

function toMeta(post: Post): PostMeta {
  return {
    title: post.title,
    created_at: post.created_at,
    updated_at: post.updated_at,
    category: post.category,
    tags: post.tags,
    excerpt: post.excerpt,
    permalink: post.permalink,
    slug: post.slug,
    thumbnail: deriveThumbnail(post.body),
  }
}

function toFull(post: Post): PostFull {
  return {
    ...toMeta(post),
    body: post.body,
  }
}

const sorted = [...velitePosts].sort(
  (a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
)

export function getAllPosts(): PostMeta[] {
  return sorted.map(toMeta)
}

export function getPostByPermalink(permalink: string): PostFull | undefined {
  const found = sorted.find((p) => p.permalink === permalink)
  return found ? toFull(found) : undefined
}

export function getAllPermalinks(): string[] {
  return sorted.map((p) => p.permalink)
}
```

設計メモ:
- `PostData` という名前は捨てる。新規 callsite は TanStack route loader（`app/routes/index.tsx` / `app/routes/$.tsx`）のみであり、命名を `PostMeta` / `PostFull` に分けたほうが loader の戻り値型が明確
- `import { posts, type Post } from "../.velite"` は Phase 0 の Velite が出力するエントリ。`.velite/index.d.ts` が `Post` 型を提供する
- 並び替えは module load 時に 1 回だけ実行（記事 109 件、コスト無視できる）。route loader は同期的に slice を返すだけ

- [ ] **Step 2: 型チェック**

```bash
pnpm velite:build
pnpm test
```

Expected: tsc が exit 0。`.velite/index.d.ts` 経由で `Post` 型が解決される。

エラーが出る場合:
- `Cannot find module '../.velite'` → tsconfig の `exclude` から `.velite` を外す必要は無い。`.velite/index.js` と `.velite/index.d.ts` は include に入っていなくても type-import は moduleResolution で解決される。`pnpm velite:build` を先に実行したか確認
- `Property 'permalink' does not exist on type 'Post'` → Phase 0 の `lib/content/schema.ts` の transform で permalink が出ているはず。`cat lib/content/schema.ts | grep permalink` で確認、無ければ Phase 0 完了状態を疑う

- [ ] **Step 3: スモークで件数確認**

`scripts/inspect-posts.ts` を一時的に作って件数だけ吐くこともできるが、ここでは既存 `pnpm verify:velite` の延長で十分。直後の Task 4 で route loader から呼ぶ際に件数 109 が見える。

- [ ] **Step 4: Commit**

```bash
git add lib/posts.ts
git commit -m "feat(content): wire lib/posts.ts to velite output with permalink lookup"
```

---

## Task 4: `next/link` を `@tanstack/react-router` の `Link` に置換するシム作成

`next/link` を直接置換すると、各コンポーネントが `Link` の TanStack 版 API（`to` プロップ）と `next/link` の API（`href` プロップ）の差を吸収する必要が出てくる。差分が小さいので**最小のシム**を一枚噛ませて、コンポーネント側の修正は import path だけにする。

**Files:**
- Create: `lib/router-link.tsx`

- [ ] **Step 1: `lib/router-link.tsx` を作成**

```tsx
import { Link as RouterLink } from "@tanstack/react-router"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type Props = Omit<
  ComponentPropsWithoutRef<typeof RouterLink>,
  "to" | "children"
> & {
  href: string
  children?: ReactNode
}

export default function Link({ href, ...rest }: Props) {
  return <RouterLink to={href} {...rest} />
}
```

設計メモ:
- TanStack Router の `Link` は型安全なルートツリー連動 props を期待する。`to` を `string` にすると型が緩むが、本フェーズでは permalink が動的に決まるためあえてこの緩さを許容する（Phase 4 以降の routeTree 整理で typed `to` に切り替えるかどうかは別 PR）
- `next/link` の prefetch / scroll / replace などのプロップは現行コードでは使われていないため、シムは最低限のみ

- [ ] **Step 2: 型チェック**

```bash
pnpm test
```

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add lib/router-link.tsx
git commit -m "feat(routing): add tanstack router link shim with next/link prop signature"
```

---

## Task 5: 4 コンポーネントの `next/link` import を切り替え

シムを使い、import path だけ書き換える。コンポーネントの内部実装には触らない（styled-components のままで Phase 3 まで温存）。

**Files:**
- Modify: `components/features/article/article-tile.tsx`
- Modify: `components/features/article/article-info.tsx`
- Modify: `components/layout/navi-menu.tsx`
- Modify: `components/layout/navi-logo.tsx`

- [ ] **Step 1: 4 ファイルの import を一括置換**

各ファイルの `import Link from "next/link"` を以下に置換:

```typescript
import Link from "@/lib/router-link"
```

`replace_all` で Edit するのが確実。例:

```bash
# 確認
grep -rn 'import Link from "next/link"' components/
# Expected: 4 件
```

- [ ] **Step 2: それぞれ tsc を流す**

```bash
pnpm test
```

Expected: exit 0。既存の `<Link href="/profile">` 等は変わらず動く（シムが `href` を受けて TanStack の `to` に橋渡し）

- [ ] **Step 3: ファイル先頭の `"use client"` ディレクティブは残す**

`"use client"` は Next.js 専用ディレクティブだが、Vite / React 18 ビルドでは無視される（プレーンな文字列リテラル扱い）。後段の Next.js ファイル削除と一緒に消すと commit が肥大化するので、本タスクではそのまま残す。Task 13 で一括掃除する。

- [ ] **Step 4: Commit**

```bash
git add components/features/article/article-tile.tsx components/features/article/article-info.tsx components/layout/navi-menu.tsx components/layout/navi-logo.tsx
git commit -m "refactor(components): swap next/link to tanstack router shim in 4 components"
```

---

## Task 6: `__root.tsx` に Provider・GlobalStyle・フォント・サイト meta を結線

Phase 1 の `__root.tsx` は最小（charSet / viewport / title のみ）。Phase 2 では:
- Google Fonts (`Noto Sans JP`、`Permanent Marker`) を `<link>` で読み込む（`next/font` は Next.js 専用)
- `ThemeProvider`（既存 `lib/ThemeContext.tsx`）と `GlobalStyles`（既存 `styles/global-style.ts`）を document 内に直接マウント
- icons / manifest / canonical / og:site_name のような site-wide meta を `head()` から返す

**Files:**
- Modify: `app/routes/__root.tsx`

- [ ] **Step 1: `app/routes/__root.tsx` を以下に置換**

```tsx
/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import "modern-normalize/modern-normalize.css"
import "font-awesome/css/font-awesome.css"
import { ThemeProvider } from "@/lib/ThemeContext"
import GlobalStyles from "@/styles/global-style"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: SITE_TITLE },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/images/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/images/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/images/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;900&family=Permanent+Marker&display=swap",
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <GlobalStyles />
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

設計メモ:
- styled-components の `ServerStyleSheet` 収集はやらない。prerender 時には styles 無しの HTML が出力され、ブラウザで JS が走った瞬間に styled-components がランタイムでスタイルを注入する。**FOUC（瞬間的に未スタイル状態が見える）が出る**が、Phase 3 で CSS Modules に置換するため一時的に許容
- Google Fonts は `display=swap` で FOUT も回避。`next/font` の self-hosted 化（パフォーマンス上の利点）は Phase 3 か Phase 5 で再検討
- `font-awesome` は v4 系の CSS 直 import を維持。spec section 2 では `@fortawesome/react-fontawesome` v6 への統一が予定されているが、これは Phase 4 以降
- `lib/site.ts` は次の Step で作る

- [ ] **Step 2: `lib/site.ts` を新規作成**

```typescript
export const SITE_URL = "https://jaxx2104.info"
export const SITE_TITLE = "jaxx2104.info"
export const SITE_DESCRIPTION = "プログラムとバグが好き"
export const SITE_AUTHOR = "jaxx2104"
export const SITE_TWITTER = "jaxx2104"
export const DEFAULT_OGP_IMAGE = "/images/ogp-default.png"
```

既存 `app/[...slug]/page.tsx` の inline `siteMeta` の置換先。`DEFAULT_OGP_IMAGE` の値は既存 `lib/image-utils.ts` の `DEFAULT_THUMBNAIL` と一致。

- [ ] **Step 3: 型チェック**

```bash
pnpm test
```

Expected: exit 0

`Cannot find module 'modern-normalize/modern-normalize.css'` のような type 解決エラーが出る場合: `vite/client` 型参照が effective か確認（`/// <reference types="vite/client" />` がファイル先頭にある）。

- [ ] **Step 4: 単独 build smoke**

```bash
pnpm build:vite
```

Expected: prerender が完走、`dist/client/index.html` が生成される。生成された HTML の `<head>` に Google Fonts の `<link>` が出ていること。

```bash
grep -F 'fonts.googleapis.com' dist/client/index.html
grep -F '/manifest.json' dist/client/index.html
```

Expected: 各 1 件以上ヒット

- [ ] **Step 5: Commit**

```bash
git add app/routes/__root.tsx lib/site.ts
git commit -m "feat(routes): wire root layout with theme provider, fonts, manifest, default meta"
```

---

## Task 7: `app/routes/index.tsx` を実コンテンツに差し替え

Phase 1 stub を捨て、loader で `getAllPosts()` を呼んで `TileGrid` + `ArticleTile` を描画する。

**Files:**
- Modify: `app/routes/index.tsx`

- [ ] **Step 1: `app/routes/index.tsx` を以下に置換**

```tsx
import { createFileRoute } from "@tanstack/react-router"
import ArticleTile from "@/components/features/article/article-tile"
import Layout from "@/components/layout/layout"
import TileGrid from "@/components/ui/tile-grid"
import { getAllPosts } from "@/lib/posts"
import { SITE_TITLE, SITE_URL } from "@/lib/site"

export const Route = createFileRoute("/")({
  loader: () => ({ posts: getAllPosts() }),
  component: HomePage,
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
})

function HomePage() {
  const { posts } = Route.useLoaderData()
  return (
    <Layout>
      <TileGrid>
        {posts.map((post) => (
          <ArticleTile
            key={post.permalink}
            path={post.permalink}
            title={post.title}
            excerpt={post.excerpt}
            thumbnail={post.thumbnail}
          />
        ))}
      </TileGrid>
    </Layout>
  )
}
```

設計メモ:
- TanStack Router の loader は Promise / sync どちらも返せる。Velite 出力は同期 import なので即座に値を返す
- `Layout` は Footer + Navi のラッパー（既存）。styled-components のままで Phase 3 まで温存
- `ArticleTile` の `path` プロップに `post.permalink` を渡す。シム経由で TanStack `Link` の `to` に変換される

- [ ] **Step 2: 型チェック**

```bash
pnpm test
```

Expected: exit 0

`Property 'useLoaderData' does not exist on type 'RouteApi'` のようなエラーが出る場合:
- TanStack Router のバージョンを `pnpm list @tanstack/react-router` で確認。`Route.useLoaderData()` が無いバージョンなら `useLoaderData({ from: "/" })` の hook 形式に書き換える

- [ ] **Step 3: dev サーバーで目視確認**

```bash
pnpm dev:vite
```

別ターミナルで `curl -sf http://localhost:3000/ | head -50` か、ブラウザで `http://localhost:3000/` を開く。記事タイトルが 109 件並んでいることを確認。

確認後、dev サーバーを止める。

- [ ] **Step 4: Commit**

```bash
git add app/routes/index.tsx
git commit -m "feat(routes): render real article tile grid on home from velite"
```

---

## Task 8: `app/routes/profile.tsx` の追加

profile ページは静的（loader 不要）。既存 `app/profile/page.tsx` の構造をそのまま `app/routes/profile.tsx` に移植する。

**Files:**
- Create: `app/routes/profile.tsx`

- [ ] **Step 1: `app/routes/profile.tsx` を作成**

```tsx
import { createFileRoute } from "@tanstack/react-router"
import ProfileLink from "@/components/features/profile/profile-link"
import ProfileOthers from "@/components/features/profile/profile-others"
import ProfileUser from "@/components/features/profile/profile-user"
import ProfileWork from "@/components/features/profile/profile-work"
import Layout from "@/components/layout/layout"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"

const PROFILE_TITLE = `Profile | ${SITE_TITLE}`
const PROFILE_DESCRIPTION = "I'm a front-end engineer in Japan 🗼"
const PROFILE_URL = `${SITE_URL}/profile/`
const PROFILE_IMAGE = "/images/profile.jpg"

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: PROFILE_TITLE },
      { name: "description", content: PROFILE_DESCRIPTION },
      { property: "og:title", content: PROFILE_TITLE },
      { property: "og:description", content: PROFILE_DESCRIPTION },
      { property: "og:url", content: PROFILE_URL },
      { property: "og:image", content: `${SITE_URL}${PROFILE_IMAGE}` },
      { name: "twitter:title", content: PROFILE_TITLE },
      { name: "twitter:description", content: PROFILE_DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}${PROFILE_IMAGE}` },
    ],
    links: [{ rel: "canonical", href: PROFILE_URL }],
  }),
})

function ProfilePage() {
  return (
    <Layout>
      <ProfileUser profileImage={PROFILE_IMAGE} />
      <ProfileLink />
      <ProfileWork />
      <ProfileOthers />
    </Layout>
  )
}
```

設計メモ:
- 既存 `Meta` コンポーネント（`components/ui/meta.tsx`）相当の OGP は `head()` 内で全部出す。`SITE_DESCRIPTION` を import しているのは将来の修正で他ページとプロフィールの description を別管理にする可能性があるためのフックだが、現時点では `PROFILE_DESCRIPTION` のみ使用 — 不要なら import 行から外す

- [ ] **Step 2: 型チェック + dev で目視**

```bash
pnpm test
pnpm dev:vite
# 別ターミナル: curl -sf http://localhost:3000/profile/ | head -30
```

Expected: プロフィールページの本文 HTML が返る。`<title>` に `Profile | jaxx2104.info`、`<meta property="og:image">` に `/images/profile.jpg` が出る。

- [ ] **Step 3: Commit**

```bash
git add app/routes/profile.tsx
git commit -m "feat(routes): add profile route with full ogp meta"
```

---

## Task 9: `app/routes/$.tsx`（splat ルート）と permalink loader

記事詳細ルート。Phase 1 で確定した permalink lookup 設計（`lib/posts.ts:getPostByPermalink`）を loader に結線する。OGP 画像は記事の thumbnail（本文先頭の `/images/posts/...`）→ 既定の `/images/ogp-default.png` の順でフォールバック。

**Files:**
- Create: `app/routes/$.tsx`

- [ ] **Step 1: `app/routes/$.tsx` を作成**

```tsx
import {
  createFileRoute,
  notFound,
  useLoaderData,
} from "@tanstack/react-router"
import Article, {
  type SiteMetaType,
} from "@/components/features/article/article"
import Layout from "@/components/layout/layout"
import { getPostByPermalink } from "@/lib/posts"
import {
  DEFAULT_OGP_IMAGE,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_TWITTER,
  SITE_URL,
} from "@/lib/site"

const SITE_META: SiteMetaType = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  siteUrl: SITE_URL,
  author: SITE_AUTHOR,
  twitter: SITE_TWITTER,
}

export const Route = createFileRoute("/$")({
  loader: ({ params }) => {
    // params._splat is everything after the root, without leading slash.
    // Velite emits permalinks with both leading and trailing slash, so we
    // wrap accordingly. autoSubfolderIndex+trailingSlash means the URL
    // visitor saw was /xxx/, splat gives "xxx" (or "xxx/" depending on
    // tanstack version). Normalize to "/<value>/".
    const raw = params._splat ?? ""
    const trimmed = raw.replace(/^\/+|\/+$/g, "")
    const permalink = `/${trimmed}/`
    const post = getPostByPermalink(permalink) ?? getPostByPermalink(`/${trimmed}`)
    if (!post) throw notFound()
    return { post, permalink: post.permalink }
  },
  component: PostPage,
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { post } = loaderData
    const title = `${post.title} | ${SITE_TITLE}`
    const description = post.excerpt || SITE_DESCRIPTION
    const url = `${SITE_URL}${post.permalink}`
    const image = `${SITE_URL}${post.thumbnail ?? DEFAULT_OGP_IMAGE}`
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    }
  },
  notFoundComponent: NotFoundComponent,
})

function PostPage() {
  const { post } = useLoaderData({ from: "/$" })
  return (
    <Layout>
      <Article
        path={post.permalink}
        title={post.title}
        created_at={post.created_at}
        categories={post.category ? [post.category] : null}
        tags={post.tags ?? null}
        html={post.body}
        site={SITE_META}
      />
    </Layout>
  )
}

function NotFoundComponent() {
  return (
    <Layout>
      <main>
        <h1>404 — Not Found</h1>
        <p>This permalink does not match any post.</p>
      </main>
    </Layout>
  )
}
```

設計メモ:
- spec section 5 の URL 互換性は `/<slug>/` 形式（末尾スラッシュ付き）。TanStack Router の splat (`$`) で `params._splat` は **先頭スラッシュ無し・末尾スラッシュ無し**で渡る想定。`autoSubfolderIndex` は **prerender 時の出力ファイル名**にしか影響しないため、loader 側で normalize する必要がある
- `getPostByPermalink(permalink)` でまず末尾スラッシュ付きを試し、外して再試行する fallback を残しておく（Velite schema の transform で permalink がどちら付きで入っているかは実装で確定するため、両方対応しておく安全策）
- `useLoaderData({ from: "/$" })` の path 文字列が tsr が生成する route id と一致する必要がある。route ファイル `app/routes/$.tsx` → id は `/$`。違っていたら biome / tsc が型エラーで知らせる
- `post.body` は Velite が shiki + rehype-link-card で処理済みの HTML。`Article` コンポーネントの `dangerouslySetInnerHTML={{__html: html}}` にそのまま流す

- [ ] **Step 2: 型チェック + dev 目視**

```bash
pnpm test
pnpm dev:vite
# 別ターミナル: curl -sf http://localhost:3000/php-replace-lf/ | head -50
```

Expected:
- 該当記事の HTML が返る
- `<title>` に `PHPで改行コードを（LF）に統一する方法 | jaxx2104.info`
- `<meta property="og:image">` に `/images/posts/IMG_1003-365fb6.jpg` が含まれる

`Cannot find name 'useLoaderData'` のエラーが出る場合: `@tanstack/react-router` のメジャーバージョンによる API 差。`Route.useLoaderData()` の static method が使えるかを試す:

```tsx
const { post } = Route.useLoaderData()
```

- [ ] **Step 3: 歴史的リネームスラッグ 4 件のうち 1 件を確認**

spec section 12 の `2017-08-04-listening-book → /readme-siri/` を実際に開いて表示できることを確認:

```bash
curl -sfI http://localhost:3000/readme-siri/ | head -3
```

Expected: 200 OK で HTML が返る。permalink (`/readme-siri/`) で lookup できれば設計通り。

- [ ] **Step 4: Commit**

```bash
git add app/routes/\$.tsx
git commit -m "feat(routes): add splat route for post detail with permalink loader and ogp"
```

---

## Task 10: prerender に全 permalink を明示注入

`vite.config.mts` の `tanstackStart()` プラグインに `pages` 配列を渡す。crawlLinks に依存すると、`/` から到達不可能なページ（リネーム前 slug など）を取りこぼす可能性がある。Velite 出力 (`.velite/posts.json`) からビルド時に permalink 一覧を読み出し、`/`、`/profile/`、各記事 permalink を `pages` に積む。

**Files:**
- Modify: `vite.config.mts`

- [ ] **Step 1: `vite.config.mts` を以下に置換**

```typescript
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
      `[vite.config] could not read ${veliteFile}: ${(err as Error).message}. Falling back to crawlLinks only.`,
    )
    return []
  }
}

const permalinks = loadPermalinks()

export default defineConfig({
  server: {
    port: 3000,
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
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
        pages: ["/", "/profile/", ...permalinks],
      },
    }),
    viteReact(),
  ],
})
```

設計メモ:
- ビルド前に `pnpm velite:build` が実行される（`scripts.build:vite` の前段）。`.velite/posts.json` が無い状態で vite が起動するのは初回 clone 直後 + `pnpm dev:vite` のみで、その場合は `crawlLinks` のみで動かす（dev では prerender を完走する必要が無いため許容）
- `pages` は `tanstackStart()` plugin の prerender option で受けるキー。インストール済みの plugin のバージョンで型が `pages?: string[]` を受け付けない場合は、Phase 1 plan の Revisions 表と同じ要領で本 plan の Revisions に書き戻し、`crawlLinks: true` のみに退化させる（ただしリンク到達性を全 permalink について Task 13 の smoke で別途検証）

- [ ] **Step 2: prerender 完走を確認**

```bash
pnpm build:vite
ls dist/client/ | head -20
find dist/client -name "index.html" | wc -l
```

Expected: `index.html` が **109 + 2 = 111 件**（記事 109 + ホーム + profile）出力される。

`failOnError: true` で落ちる場合:
- `pages` に渡した permalink が loader で `notFound()` を返している → permalink の lookup 不一致を疑う。`getPostByPermalink` が末尾スラッシュ問題で失敗している可能性。Task 9 の loader を見直す
- 一時的に `failOnError: false` にして prerender ログを確認、原因記事を特定して修正後に戻す

- [ ] **Step 3: 既知の記事 HTML を内容確認**

```bash
test -f dist/client/php-replace-lf/index.html && echo "OK: php-replace-lf"
test -f dist/client/readme-siri/index.html && echo "OK: readme-siri"
test -f dist/client/profile/index.html && echo "OK: profile"
grep -F 'og:title' dist/client/php-replace-lf/index.html
```

Expected: 3 件の OK と、最後の grep で `og:title` を含む `<meta>` タグが出る

- [ ] **Step 4: Commit**

```bash
git add vite.config.mts
git commit -m "feat(build): inject velite permalinks into tanstack prerender pages"
```

---

## Task 11: Next.js 専用ファイルの削除

Phase 2 の TanStack ルートが揃ったので、対応する Next.js page と、Next.js 専用の helper (`lib/registry.tsx`、`components/Providers.tsx`、`components/ui/meta.tsx`) を削除する。Cloudflare Pages の `build.sh` は **`CF_PAGES_BRANCH == "main"` のときだけ `pnpm build`（Next.js）を呼ぶ**ため、本ブランチでは Next.js が壊れても本番に影響しない。

**Files:**
- Delete: `app/page.tsx`、`app/layout.tsx`、`app/[...slug]/page.tsx` および `app/[...slug]/` ディレクトリ、`app/profile/page.tsx` および `app/profile/` ディレクトリ
- Delete: `lib/registry.tsx`
- Delete: `components/Providers.tsx`
- Delete: `components/ui/meta.tsx`
- Delete: `app/CLAUDE.md`（Next.js App Router 前提の記述。Phase 4 で書き直す予定なので一旦削除して問題なし）

- [ ] **Step 1: 削除を実行**

```bash
rm app/page.tsx app/layout.tsx
rm -r app/[...slug]
rm -r app/profile
rm lib/registry.tsx components/Providers.tsx components/ui/meta.tsx
rm app/CLAUDE.md
```

- [ ] **Step 2: 残コンポーネントから `"use client"` ディレクティブを除去**

Next.js が消えたので `"use client"` は誤解を招く。`grep -rln '"use client"' components/ lib/ app/` で残存箇所を出し、各ファイル冒頭の `"use client"` 行を削除する。

```bash
grep -rln '"use client"' components/ lib/ app/
```

該当ファイル群（Phase 1 / 2 で touch したものに加えて、`profile-*.tsx`、`navi.tsx`、`thumbnail.tsx`、`Providers.tsx`（既に削除）など）に対して各 1 行削除。

- [ ] **Step 3: tsc で漏れを確認**

```bash
pnpm test
```

Expected: exit 0

エラーが出る場合:
- `Cannot find module '@/lib/image-utils'` などの参照漏れ → 削除した `app/[...slug]/page.tsx` でしか使われていなかったコードへの参照。`lib/image-utils.ts` 自体は Phase 4 まで残すが、`DEFAULT_THUMBNAIL` 定数は新 `lib/site.ts:DEFAULT_OGP_IMAGE` に統一済み。残った参照を `lib/site.ts` 経由に書き換える
- `'next/font/google' has no exported member 'Noto_Sans_JP'` などの import エラー → 既に削除済みの `app/layout.tsx` 経由でなければ参照されないはず。残っていれば該当ファイルを削除

- [ ] **Step 4: Next.js scripts を `package.json` から退避**

Next.js コードは消えたが、本フェーズで `package.json` の `scripts.dev` / `scripts.build` を **Vite に切り替える**。`next dev` / `next build` は呼ばれなくても `package.json` に残っていると将来の事故源。Phase 4 で `next` 依存を消すが、scripts はここで切り替えておく。

`package.json` の `scripts` を以下のように修正:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "pnpm velite:build && vite build",
    "start": "vite preview --port 4173",
    "deploy": "pnpm build",
    "dev:next": "next dev",
    "build:next": "next build"
  }
}
```

差分:
- `dev` / `build` / `start` を Vite 系に切り替え
- 旧 Next.js scripts は `dev:next` / `build:next` に退避（`pnpm test` で `next-env.d.ts` 経由の型解決が壊れたら一時復活させる用、Phase 4 で削除）
- `dev:vite` / `build:vite` / `preview:vite` は重複なので削除

- [ ] **Step 5: Cloudflare Pages の `build.sh` を見直し**

Phase 1 の `build.sh` は `main → pnpm build`（Next.js を期待）/ `else → pnpm build:vite` だった。`pnpm build` を Vite に振り替えたので、`build.sh` も再設計する:

```bash
#!/bin/bash
# Cloudflare Pages build entry.
#
# Phase 2 onward: pnpm build is the TanStack Start build.
# We keep the branch dispatch for safety: main can be flipped back to
# Next.js via pnpm build:next if a regression forces a rollback.
set -euo pipefail
branch="${CF_PAGES_BRANCH:-main}"
echo "build.sh: branch=$branch -> pnpm build (TanStack Start)"
pnpm build
```

`wrangler.toml` の `pages_build_output_dir` は既に `dist/client` 想定（Phase 1）なので変更不要。

- [ ] **Step 6: `pnpm test` と `pnpm build` のローカル確認**

```bash
rm -rf dist .velite
pnpm install --frozen-lockfile
pnpm test
pnpm build
test -f dist/client/index.html && echo "OK: dist built"
```

Expected: 全部 exit 0、`dist/client/index.html` が再生成される。**`.velite` を消した状態からの初回ビルドで `vite.config.mts` の `loadPermalinks()` がフォールバックして警告を出す** が、`pnpm build` は `pnpm velite:build && vite build` の順で実行されるので、velite が先に走り .velite/posts.json が出てから vite.config.mts が再評価される。万一 vite.config.mts が一度だけ評価されてキャッシュが残るようなら、Task 10 の Revisions に書き戻して fix を計画する

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: drop next.js pages and helpers in favor of tanstack routes"
```

`-A` を使うのは大量削除だから。事前に `git status` で意図しないファイルが含まれていないか確認:

```bash
git status -s
```

Expected: `D` (delete) が 8 件前後 + `M` (modify) が `package.json`、`build.sh` の 2 件 + 各コンポーネントの `"use client"` 削除分

---

## Task 12: ダークモード初期表示のちらつき対策

spec section 11 のリスク表「ダークモード初期表示のちらつき」を Phase 2 で潰す（Phase 3 の CSS variables 化とは独立に対応可能）。`<head>` の先頭でインライン script を実行し、`localStorage` から theme を読んで `document.documentElement.dataset.theme` を即時設定する。

**Files:**
- Modify: `app/routes/__root.tsx`

- [ ] **Step 1: `__root.tsx` の `<head>` 内に theme 初期化スクリプトを追加**

`__root.tsx` の `RootDocument` を以下のように修正（`<head>` 内、`<HeadContent />` の **直後**に script を挿入）:

```tsx
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted inline init
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <GlobalStyles />
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

設計メモ:
- 現状 `lib/ThemeContext.tsx` は state ベースで `data-theme` を直接書き換えていない。Phase 3 の CSS variables 化で `[data-theme="dark"]` セレクタを使う際にこのスクリプトが活きてくる。Phase 2 の段階では styled-components のままなので、このスクリプトは「テーマ判定の初期値を読み出す」役割は果たすが、見た目は変えない（styled-components に値が反映されるのは React 起動後）
- それでも Phase 2 で入れておく価値は2つ: (1) Phase 3 でスタイルを差し替えた瞬間にちらつき対策が機能する、(2) インライン script の構文エラーを Phase 2 のうちに検出できる

- [ ] **Step 2: `pnpm build` で HTML に script が出力されることを確認**

```bash
pnpm build
grep -F 'localStorage.getItem' dist/client/index.html
```

Expected: 1 件以上ヒット

- [ ] **Step 3: Commit**

```bash
git add app/routes/__root.tsx
git commit -m "feat(routes): inline theme bootstrap script to avoid dark-mode flash"
```

---

## Task 13: CI smoke check の更新

Phase 1 で入れた `'Phase 1 stub'` の grep を削除し、Phase 2 の Gate（一覧 + プロフィール + 既知の記事 + OGP の存在）を CI で常時検証する。

**Files:**
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: `.github/workflows/test.yml` の smoke ステップを以下に置換**

ファイル末尾の `Build vite (tanstack start prerender)` と `Verify dist artifacts` を以下に書き換え:

```yaml
      - name: Build prerender (tanstack start)
        run: pnpm build

      - name: Verify dist artifacts
        run: |
          test -f dist/client/index.html
          test -f dist/client/profile/index.html
          test -f dist/client/php-replace-lf/index.html
          # Renamed-slug post (historical permalink rewrite)
          test -f dist/client/readme-siri/index.html
          # Total prerendered pages: home + profile + 109 posts = 111
          count=$(find dist/client -name index.html | wc -l)
          test "$count" -ge 111 || (echo "expected >=111 index.html, got $count" && exit 1)
          # OGP meta presence on a known post
          grep -F 'og:image' dist/client/php-replace-lf/index.html
          grep -F 'og:type' dist/client/php-replace-lf/index.html
          grep -F 'rel="canonical"' dist/client/php-replace-lf/index.html
```

設計メモ:
- `pnpm build` に切り替えたので `build:vite` 呼び出しは不要
- 件数下限を **111 件**（home + profile + 109 posts）にしておくと、velite に新記事が追加されたとき false-fail せず（`>=` だから）、削除された場合に検出される
- `php-replace-lf` は最古記事（2013-08-06）。万一この記事自体を削除する未来が来たら CI smoke を別記事に張り替える

- [ ] **Step 2: ローカルで CI 相当を再現**

```bash
rm -rf dist .velite node_modules/.cache
pnpm install --frozen-lockfile
pnpm test
pnpm build
bash -e -c '
test -f dist/client/index.html
test -f dist/client/profile/index.html
test -f dist/client/php-replace-lf/index.html
test -f dist/client/readme-siri/index.html
count=$(find dist/client -name index.html | wc -l)
test "$count" -ge 111 || (echo "got $count" && exit 1)
grep -F "og:image" dist/client/php-replace-lf/index.html
grep -F "og:type" dist/client/php-replace-lf/index.html
grep -F "rel=\"canonical\"" dist/client/php-replace-lf/index.html
echo OK
'
```

Expected: `OK` が表示される

- [ ] **Step 3: Commit + push + CI 確認**

```bash
git add .github/workflows/test.yml
git commit -m "ci: replace phase 1 stub smoke with phase 2 routing+ogp checks"
git push
```

GitHub Actions が緑になることを確認:

```bash
gh run list --branch modernize-stack-phase1-tanstack-skeleton --limit 1
```

Expected: 最新 run が `success`

CI が落ちた場合: ローカルとの環境差を疑う。`NODE_VERSION` / pnpm version の食い違い、`.velite/` の hash 揺れなどが典型。Phase 1 の Revisions と同じ書式で本 plan の Revisions に追記し、修正コミットを足す。

---

## Task 14: Cloudflare Pages Deploy Preview での目視レビュー

CI が緑になると Cloudflare Pages が `dist/client` を Preview URL に publish する。`gh pr view` で Preview URL を取得し、現行 Next.js 本番と Preview を**目視で**比較する。Phase 2 の Gate 達成判定。

**Files:**
- なし（PR / Preview の操作のみ）

- [ ] **Step 1: PR を Ready にして Cloudflare の status を待つ**

Phase 1 の PR がまだ draft のままなら ready に切り替え:

```bash
gh pr ready
gh pr view --json statusCheckRollup,number,url
```

Expected: PR が ready、Cloudflare Pages の deploy preview URL が status checks に出る

- [ ] **Step 2: 比較対象の URL リストを作る**

| 比較 | 現行（main 本番） | Preview |
|---|---|---|
| トップ | https://jaxx2104.info/ | (Preview URL)/ |
| プロフィール | https://jaxx2104.info/profile/ | (Preview URL)/profile/ |
| 記事 1（最新） | https://jaxx2104.info/<最新 permalink> | (Preview URL)/<最新 permalink> |
| 記事 2（PHP コードハイライト） | https://jaxx2104.info/php-replace-lf/ | (Preview URL)/php-replace-lf/ |
| 記事 3（リネーム slug） | https://jaxx2104.info/readme-siri/ | (Preview URL)/readme-siri/ |
| 記事 4（最近のリンクカード入り） | (link-card 利用記事を `grep` で 1 件選定) | (Preview URL)/<該当> |

Preview URL は `gh pr view` の出力か Cloudflare Dashboard で確認。

- [ ] **Step 3: 目視確認チェックリスト**

各 URL ペアに対して:
- [ ] 記事タイトル / 本文 / コードブロックが表示されている（FOUC が一瞬出るのは許容）
- [ ] `<title>` が現行と同じ
- [ ] `<meta property="og:image">` が同じ画像を指している（hash 付与で名前が変わっているのは許容）
- [ ] リンクカードが描画される（該当記事のみ）
- [ ] ナビ・フッタ・プロフィール画像が出る

差異が出た項目を Phase 2 plan の Revisions 表に書き戻す。重大（記事が表示されないなど）であれば該当 Task に戻って修正、軽微（FOUC、フォント描画タイミングなど）であれば Phase 3 のメモに格上げ。

- [ ] **Step 4: 必要なら `_redirects` を追加**

OGP 画像 URL が `/images/posts/<file>.<ext>` から `/images/posts/<file>-<hash>.<ext>` に変わって既存ソーシャル投稿が壊れる場合のみ、`public/_redirects` に旧 URL → 新 URL のリダイレクトを書く。Phase 0 plan で `output.name: "[name]-[hash:6].[ext]"` を採用済みのため、画像 URL は変わっている可能性が高い。

具体的な対処は **目視で必要性を判定してから**書く。今書き溜めるのは YAGNI 違反。

---

## Task 15: spec の Phase 2 完了マーク

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: section 9 の Phase 2 見出しに完了マークを追加**

`### Phase 2: ルートとデータ層の移植（2〜3 日）` を以下に書き換え:

```markdown
### Phase 2: ルートとデータ層の移植（2〜3 日）（完了: YYYY-MM-DD）

- `app/routes/$.tsx` の loader で Velite 出力（`lib/posts.ts` 経由）を import → 記事描画
- `app/routes/index.tsx` で全 109 件の記事タイル一覧
- `app/routes/profile.tsx` でプロフィール
- `head()` API で OGP / title / description / canonical を移行（`lib/site.ts` で site-wide 定数化）
- 画像は Velite が `public/images/posts/` に配置済みの URL をそのまま使用、OGP 画像は本文先頭画像 → `DEFAULT_OGP_IMAGE` のフォールバック
- `vite.config.mts` の `tanstackStart()` プラグインに `pages: [...permalinks]` を渡し、決定論的 prerender に
- `next/link` を 4 コンポーネントで `@tanstack/react-router` の Link シム (`lib/router-link.tsx`) に置換
- Next.js 専用 page / `lib/registry.tsx` / `components/Providers.tsx` / `components/ui/meta.tsx` を削除、`pnpm dev` / `pnpm build` を Vite 系に切り替え
- ダークモード初期表示のちらつき対策（`<head>` の inline theme bootstrap script）も先行実装
- **Gate 完了**: PR <番号> の Cloudflare Pages Preview で home / profile / 既知 5 記事を現行 Next.js 本番と目視比較し、表示と OGP が同等であることを確認
```

- [ ] **Step 2: section 12「Phase 0 検証結果と未決事項」の残課題を整理**

「OGP 画像の生成パイプライン（`scripts/`）の確認は Phase 2 で実施。」の項目を解消済みに移し、本文を以下に置換:

```markdown
- OGP 画像: 現行 Next.js では `app/[...slug]/page.tsx` で「本文先頭画像 → `DEFAULT_THUMBNAIL`」の 2 段フォールバックを返していた。Phase 2 では Velite 出力 `body` HTML から最初の `/images/posts/...` を抽出して同等の挙動を再現（`lib/posts.ts:deriveThumbnail`）。`/images/ogp-default.png` は既存の static asset をそのまま使う。Phase 3 以降は cover frontmatter フィールドを optional に追加して、本文先頭画像でカバーできない記事を明示できるよう拡張する案を検討（YAGNI なので実装は需要が出てから）
```

「`react-share` の利用箇所と styled-components 依存の有無は Phase 3 着手時に再確認。」は Phase 3 着手前の課題なので残す。

- [ ] **Step 3: section 10「段階的マージ」の改訂注を追記**

```markdown
**Phase 2 完了時点の判断 (YYYY-MM-DD)**: Phase 1 + Phase 2 が同一ブランチで揃い、Cloudflare Pages Preview に現行 Next.js 本番と表示同等の Vite 成果物が出る状態に。ただし styled-components のランタイム実行が残るため初期描画に FOUC があり、視覚的同等性は完全ではない。Phase 3 で CSS Modules に置換するまでは main にマージしない方針を維持。
```

- [ ] **Step 4: Commit + push**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs(spec): mark phase 2 complete with cloudflare preview gate"
git push
```

PR の本文を `gh pr edit --body` で更新し、Phase 1 / Phase 2 の両方をカバーする summary に書き直す（任意。レビュアーが読みやすければ ok）。

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec Phase 2 全項目のカバレッジ**
   - `$.tsx` の loader で Velite 出力を import → 記事描画 → Task 9
   - `index.tsx` で記事一覧 → Task 7
   - `profile.tsx` でプロフィール → Task 8
   - `head()` API で OGP / title / description を移行 → Task 6 / 7 / 8 / 9
   - 画像は Velite が `public/` に配置済みの URL を使用 → Task 3 / 9
   - **Gate**: 全記事と一覧が表示され、OGP が現行と同等 → Task 13 (CI smoke) + Task 14 (目視)

2. **Spec section 12 の Phase 2 着手前タスク**
   - OGP 画像生成パイプラインの確認 → Task 9 + Task 15 Step 2

3. **placeholder 残留なし**: タスク内に "TBD"、"TODO"、"後で書く" が残っていないか

4. **型整合**:
   - `lib/posts.ts` の `PostMeta` / `PostFull` 型が、それを参照する `index.tsx` / `$.tsx` / `ArticleTile` の prop と整合
   - `lib/router-link.tsx` の `Link` シムが、4 コンポーネントが渡す `href` プロップだけで動く（`next/link` の他のプロップが使われていないか）
   - `vite.config.mts` の `pages: string[]` が `tanstackStart()` plugin の現バージョンの型で受け付けられる
   - `app/routes/$.tsx` の `useLoaderData({ from: "/$" })` の `from` 文字列が routeTree.gen.ts と一致

5. **シェルとパス整合**: fish 環境で `pnpm` 経由のコマンドが通る、`$()` などの bash 依存記法を `gh pr` 系以外で使っていない、`rm -r app/[...slug]` の glob 展開を fish が壊さない（必要なら `'app/[...slug]'` のクォート）

6. **branch / merge 運用**:
   - 全 commit が `modernize-stack-phase1-tanstack-skeleton` ブランチ上にある
   - main の `next.config.mjs` / Next.js コードはブランチでのみ削除されており、main は無傷
   - PR の本文を Phase 1 + Phase 2 両方を反映する形に更新

7. **本番影響ゼロの確認**: `build.sh` の分岐は本フェーズでも維持（Cloudflare main → `pnpm build`、それ以外も `pnpm build`）。Phase 4 で `next` 依存を消すまで、main を pull してきても本番デプロイは引き続き Vite 成果物（`dist/client/`）を配信する形に切り替わるが、main ブランチには Phase 2 の変更は届いていないため、main から自動 deploy される本番は Phase 1 と同じ状態（Next.js）のまま。Phase 5 マージで一気に切り替わる

8. **Phase 0 で得た build artifact pitfall への準拠**:
   - `lib/posts.ts` から Velite 出力を import する形になり、`pnpm build` の前段に `pnpm velite:build` が必須。`scripts.build` で順序を担保（Task 11 Step 4）
   - `vite.config.mts` の `loadPermalinks()` が `.velite/posts.json` 不在で fallback する設計（Task 10）。CI は `pnpm install --frozen-lockfile && pnpm test && pnpm build` の順で `.velite/` をクリーンビルドして再現
   - `as const` で sealed な値を SDK 引数に渡していない（Task 6 / 9 で head/links を素のオブジェクト配列で返す）
