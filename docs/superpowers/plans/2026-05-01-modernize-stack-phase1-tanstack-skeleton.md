# Stack Modernization Phase 1: TanStack Start ひな型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TanStack Start (Vite, prerender) の最小ひな型を `app/routes/__root.tsx` と `app/routes/index.tsx` で立ち上げ、`vite build` の prerender 出力を Netlify Preview で表示できる状態にする。Next.js のビルドはこのフェーズではまだ並立させ、本番（main）には影響を与えない。同時に `tsconfig.json` を `target: ES2022` に更新し、`next.config.mjs` の `typescript.ignoreBuildErrors: true` / `eslint.ignoreDuringBuilds: true` を撤廃する。

**Architecture:** Phase 0 で導入した `velite` 出力にはこのフェーズでは触れない。`@tanstack/react-start` の Vite プラグインを `vite.config.ts` に登録し、`@tanstack/router-plugin` で `app/routes` をスキャンして `app/routeTree.gen.ts` を生成する。Next.js は `app/layout.tsx` / `app/page.tsx` / `app/[...slug]/page.tsx` のみを認識し、`app/routes/*.tsx` は無視する（命名規約が一致しないため）。ビルド成果物は Next.js の `out/` と Vite の `dist/` を並立させ、Netlify Preview のみブランチ commit の `netlify.toml` で `dist/` に切り替える。Phase 5 の merge 完了まで main の本番ビルドは Next.js のまま維持。

**Tech Stack:** vite ^8（`@vitejs/plugin-react@^6` と `@tanstack/start-plugin-core@^1.169` の peer 要求により Vite 8 必須。Rolldown bundler が RC-stage で同梱される点を許容）、@tanstack/react-start（最新 stable）、@tanstack/react-router（router-plugin 同梱）、@vitejs/plugin-react、TypeScript 5.8（target ES2022 へ更新）、React 18.3.1（19 化は Phase 5）

---

## Revisions（実装中に確定した方針差分）

実装途中で plan の前提が崩れた箇所。spec 側は section 9 / section 2 / section 4 にすべて反映済み。本 plan の本文は **当初案のまま** 残しているので、実装内容の正解は spec を参照すること。

| 当初 plan の前提 | 実装後の現実 | 確定理由 |
|------|------|------|
| `vite.config.ts` | `vite.config.mts` | `@tanstack/react-start/plugin/vite` が ESM-only。Vite 8 / rolldown は `.ts` を CJS 解釈するため `.mts` 必須 |
| `tanstackStart({ tsr: {...} })` 引数で routes 指定 | `tsr.config.json` だけで指定 | インストール版の plugin 型定義に `tsr` キーが無く TS2353。`tsr.config.json` を保険として併用していたのでそちらに一本化 |
| `app/router.tsx` は `createRouter` のみ export | `createRouter` + `getRouter` を export | `@tanstack/start-client-core` が `getRouter` を `#tanstack-router-entry` 経由で import するため必須 |
| `vite.config.mts` に `srcDirectory: "app"` 不要 | 必須 | TanStack Start plugin の既定が `src/` で、本リポジトリは `app/` 配置のため明示が必要 |
| `vite.config.mts` の `environments.ssr` は素 | `entryFileNames: "[name].js"` を強制 | rolldown の SSR 出力が `.mjs` になるが TanStack Start の preview/prerender server が hardcoded で `.js` 拡張子で import するため |
| `dist/index.html` を deploy / smoke 対象 | `dist/client/index.html` | TanStack Start は `dist/client/` (HTML + assets) と `dist/server/` (SSR bundle) に分離出力する |
| ホスティングは Netlify、`netlify.toml` で Preview 切替 | Cloudflare Pages、`build.sh` (CF_PAGES_BRANCH 分岐) + `wrangler.toml` (`pages_build_output_dir`) | リポジトリ実態が Cloudflare Pages だった。`netlify.toml` は当初追加したが Phase 1 終盤に削除 |
| Phase 1 内で main を一切触らない | `build.sh` のみ main に 1 commit 直 push | Cloudflare dashboard が main / preview ともに `bash build.sh` を呼ぶようになるため、main 側にも script 本体が必要 |
| `package.json` に `vite ^7` を追加 | `vite ^8` | `@vitejs/plugin-react@^6` と `@tanstack/start-plugin-core` の peer 要求 |
| CI smoke check は `grep` | `grep -F`（fgrep） | prerender HTML に UTF-8 em-dash が含まれ、デフォルト locale の grep が literal match に失敗する |

---

## File Structure

### Create
- `app/routes/__root.tsx` — ルートレイアウト（HeadContent、Outlet、Scripts）
- `app/routes/index.tsx` — トップページのプレースホルダ（Phase 2 で記事一覧に置換）
- `app/router.tsx` — `createRouter()` でルーター生成（再利用エントリ）
- `vite.config.ts` — `tanstackStart()` プラグイン + tsr 設定 + prerender 設定
- `tsr.config.json` — `routesDirectory: "./app/routes"`、`generatedRouteTree: "./app/routeTree.gen.ts"`（プラグイン引数の重複を避ける目的の補助設定。CLI でも使う場合に必要）

### Modify
- `package.json` — TanStack/Vite の依存追加、`scripts.dev:vite` / `scripts.build:vite` / `scripts.preview:vite` を追加。既存 `scripts.dev` / `scripts.build` は Next.js のまま維持
- `tsconfig.json` — `target` を `ES2017` → `ES2022`、`include` に `vite.config.ts`、`tsr.config.json` 直接 import はしないが routeTree のために `app/**/*.tsx` の include は維持。`exclude` に `app/routeTree.gen.ts`、`dist`、`.netlify` を追加
- `next.config.mjs` — `typescript.ignoreBuildErrors: true` と `eslint.ignoreDuringBuilds: true` を削除
- `.gitignore` — `dist/`、`.netlify/`、`app/routeTree.gen.ts`、`.tanstack/` を追加
- `netlify.toml`（無ければ作成） — このブランチ限定で `command = "pnpm build:vite"`、`publish = "dist"` に切替。main 用ではないことをコメントで明記
- `.github/workflows/test.yml` — `pnpm test`（tsc）が新しい tsconfig で通ることを確認するステップ。`pnpm build:vite` を smoke で走らせる
- `content/posts/2013-09-05-iphoto-photobook/index.md` — dead な相対画像参照を削除（Velite が処理できる状態にする）
- `content/posts/2024-06-10-jaxx-keycaps/index.md` — 同上（実行時に画像参照を確認のうえ修正）
- `docs/superpowers/specs/2026-05-01-modernize-stack-design.md` — Phase 1 完了マーキングと残課題の更新

### Untouched
- `app/layout.tsx`、`app/page.tsx`、`app/profile/page.tsx`、`app/[...slug]/page.tsx` — Next.js の本番ビルドを支えるため Phase 1 では一切触らない（Phase 2 で `$.tsx` に置換）
- `lib/posts.ts`、`lib/image-utils.ts`、`lib/registry.tsx`、`styles/global-style.ts`、`styles/theme.ts` — Phase 3〜4 で撤去
- `velite.config.ts`、`lib/content/**` — Phase 0 で固めた状態を維持
- `components/**` — Phase 3 で CSS Modules 化するまで触らない

---

## Conventions

- 新規 Vite/TanStack コードは `app/routes/`、`app/router.tsx` に配置。Next.js が利用する `app/layout.tsx` / `app/page.tsx` / `app/[...slug]/page.tsx` / `app/profile/page.tsx` とは命名規約が衝突しないため共存可能（Next.js は `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` / `route.ts` のみをルート扱いする）
- ブランチ名は `modernize-stack-phase1-tanstack-skeleton`。`origin/main` から分岐し、main にマージするタイミングは Phase 5 完了後（spec 9 の改訂方針に従う）
- TanStack Start の依存はすべて `dependencies`、`@tanstack/router-plugin` と `@vitejs/plugin-react`、`vite` は `devDependencies`
- Phase 1 の Gate は「Netlify Preview に空ページが表示される」。中身は固定文字列で良い

### React 18 / 19 互換性の注意
Phase 1 では React 18.3.1 のままを前提にしている（spec 9 では React 19 化は Phase 5）。ただし `@tanstack/react-start` の最新版が React 19 を要求する場合がある（peer dep 警告で発覚）。Task 2 で `pnpm install` 後に peer dep 警告を確認し、React 19 が必須であれば次のいずれかを取る:

1. `@tanstack/react-start` を React 18 対応の最終バージョンに pin（pnpm の resolution strategy で対処）
2. このフェーズで React 19 に前倒しで bump し、spec の Phase 5 から「React 18 → 19」項目を削除して Phase 1 の達成事項に書き換える

判断は Task 2 の Step 4 で行う。事前に決め打ちはしない。

---

## Task 1: ブランチ作成と dead-image content gap の解消

Phase 1 着手の前提として、spec section 12 の「残課題」のうち content 側で対応すべきものを先に潰す。Velite が `body` 処理時に warn / skip している 2 件を、Phase 2 で記事描画を始める前に解消しておく。

**Files:**
- Create: `(branch) modernize-stack-phase1-tanstack-skeleton`
- Modify: `content/posts/2013-09-05-iphoto-photobook/index.md`
- Modify: `content/posts/2024-06-10-jaxx-keycaps/index.md`

- [ ] **Step 1: `origin/main` から専用ブランチを切る**

Run: `git fetch -p origin && git checkout -b modernize-stack-phase1-tanstack-skeleton origin/main`
Expected: 新ブランチに切り替わり、HEAD が `origin/main` を指している

- [ ] **Step 2: 現状の Velite ビルド warning を再現する**

Run: `pnpm velite:build 2>&1 | tee /tmp/velite-phase1-pre.log`
Expected: 既存の warning に `2013-09-05-iphoto-photobook` と `2024-06-10-jaxx-keycaps` の名前で「画像が見つからない」旨のメッセージが出る。`Velite posts: 107` 相当の出力件数を確認

- [ ] **Step 3: `2013-09-05-iphoto-photobook/index.md` の dead 画像参照を削除**

このファイルには 3 つの画像参照がある（`af7f052ca06f2b0bce7cd562ab0ef139.jpg`、`1df25fe547bf86c31fa927aef5463349.jpg`、`IMG_1417-500x500.jpg`）が、ディレクトリ内に画像ファイルが存在しない（ディレクトリは `index.md` のみ）。

`content/posts/2013-09-05-iphoto-photobook/index.md` の以下 3 行を削除:
- `![](./af7f052ca06f2b0bce7cd562ab0ef139.jpg)`（line 14 付近）
- `<img src="./1df25fe547bf86c31fa927aef5463349.jpg" />`（line 26 付近）
- `<img src="./IMG_1417-500x500.jpg" />`（line 32 付近）

それぞれ前後の空行を 1 行に整える（連続した空行が残らないように）。本文の文意は変えない（画像の有無を「ありました」「届きました」の文章に統合しないし、文章自体は維持）。

- [ ] **Step 4: `2024-06-10-jaxx-keycaps/index.md` の dead 画像参照を確認・修正**

このディレクトリには 3 枚の画像（`b5e27baca4b6dc8f4d2bab723deea9cf.jpg`、`b90c460e84614e8f41f768c80530e279.jpg`、`a22965121d0a574990ecc7349b4d1deb.jpg`）が存在するが、Velite warning では別の画像名が見つからない旨が出ている。実体を確認したうえで以下のいずれかを行う:

1. `index.md` 内の画像参照のうち、ディレクトリに存在するファイル名と一致しないものを削除する
2. ディレクトリに存在する 3 枚のいずれかにリネームして参照する（文脈に合えば）

判断手順:
1. `cat content/posts/2024-06-10-jaxx-keycaps/index.md` で本文の画像参照行を抽出
2. `ls content/posts/2024-06-10-jaxx-keycaps/` で実在ファイルを確認
3. 参照名と実在名が完全一致しない行を見つけ、Step 2 のログで Velite が指摘した名前と突き合わせる
4. dead な行を削除（または既存ファイル名にリネーム）

- [ ] **Step 5: Velite を再ビルドして warning が消えたことを確認**

Run: `pnpm velite:build 2>&1 | tee /tmp/velite-phase1-post.log`
Expected:
- 出力件数が 109 件に増えている（spec section 12 の「Velite で取れる 107 件」が +2 で 109 になる）
- `2013-09-05-iphoto-photobook` と `2024-06-10-jaxx-keycaps` に関する画像警告が出ていない

ログ差分確認: `diff /tmp/velite-phase1-pre.log /tmp/velite-phase1-post.log`

- [ ] **Step 6: 既存 cross-check スクリプトでも整合**

Run: `pnpm verify:velite`
Expected: `Velite posts:` と `Legacy posts:` がともに 109 で `OK: counts and titles match`

差分が出る場合: Phase 0 plan の Task 6 と同じトラブルシュート手順を踏む（`Only in Legacy` の場合はスキーマで弾かれている記事を特定）。

- [ ] **Step 7: Commit**

```bash
git add content/posts/2013-09-05-iphoto-photobook/index.md content/posts/2024-06-10-jaxx-keycaps/index.md
git commit -m "fix(content): remove dead image references in two posts so velite picks them up"
```

---

## Task 2: TanStack Start / Vite の依存追加と React 互換性確認

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`（pnpm が更新）

- [ ] **Step 1: ランタイム依存を追加**

Run: `pnpm add @tanstack/react-start @tanstack/react-router`
Expected: `package.json` の `dependencies` に 2 つが追加され、`pnpm-lock.yaml` が更新される

- [ ] **Step 2: 開発依存を追加**

Run: `pnpm add -D vite @vitejs/plugin-react @tanstack/router-plugin`
Expected: `devDependencies` に 3 つが追加される

- [ ] **Step 3: 直近の依存ツリーを確認**

Run: `pnpm list @tanstack/react-start @tanstack/react-router @tanstack/router-plugin vite @vitejs/plugin-react`
Expected: 5 つすべてがバージョンつきで表示される

- [ ] **Step 4: peer dependency 警告を確認し、React 18 / 19 互換性を判定**

Run: `pnpm install 2>&1 | grep -i 'peer\|react'`
Expected: peer 警告の出力。`react@>=19` を要求するものがあるかを目視確認

判定手順:
- 警告に `react@>=19` 系の peer 違反が **無い** → そのまま React 18.3.1 を維持して次の Task へ進む
- 警告に `react@>=19` 系の peer 違反が **ある** → 以下のどちらかを実行（commit メッセージで明示する）:

  Option A（推奨・小規模なら）: React 19 に bump
  ```bash
  pnpm add react@^19 react-dom@^19
  pnpm add -D @types/react@^19 @types/react-dom@^19
  ```
  この場合、本タスクの commit メッセージに `BREAKING: bump react to 19 (originally planned in Phase 5)` を含め、Task 11 の spec 更新で「React 19 化を Phase 1 に前倒しした」旨を Phase 5 から Phase 1 へ移動する。

  Option B（互換性問題が出たら）: TanStack Start を React 18 対応の旧バージョンに pin
  ```bash
  pnpm add @tanstack/react-start@<最後の react-18 対応バージョン>
  ```
  使用バージョンは npm 上で `npm view @tanstack/react-start versions --json` を見て、`peerDependencies.react` が `^18` を含むものを探す。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add tanstack/react-start, react-router, router-plugin, vite, plugin-react"
```

React 19 に bump した場合は別 commit に分離:

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): bump react to 19 (pulled forward from Phase 5 due to tanstack peer dep)"
```

---

## Task 3: TanStack Router の `tsr.config.json` を作成し routes ディレクトリを `app/routes` に固定

`@tanstack/router-plugin` のデフォルトは `./src/routes` だが、本リポジトリは spec section 4 で `app/routes/` を採用済み（Next.js の `app/` と共存可能なため）。プラグイン引数で渡しても良いが、CLI でも同じ参照を使えるよう `tsr.config.json` を併用する。

**Files:**
- Create: `tsr.config.json`

- [ ] **Step 1: `tsr.config.json` を作成**

```json
{
  "routesDirectory": "./app/routes",
  "generatedRouteTree": "./app/routeTree.gen.ts",
  "quoteStyle": "double",
  "semicolons": false
}
```

`quoteStyle` と `semicolons` は biome 既定（`"`、`;` 無し）と整合させる。

- [ ] **Step 2: `.gitignore` に生成物を追加**

`.gitignore` の末尾に追記:

```
# Vite / TanStack Start build artifacts
dist/
.netlify/
app/routeTree.gen.ts
.tanstack/
```

`.tanstack/` は TanStack Start の中間生成物の置き場。`app/routeTree.gen.ts` はプラグインが自動生成するため、commit すると競合源になる。

- [ ] **Step 3: Commit**

```bash
git add tsr.config.json .gitignore
git commit -m "chore: configure tanstack router to scan app/routes"
```

---

## Task 4: `vite.config.ts` の最小構成

**Files:**
- Create: `vite.config.ts`

- [ ] **Step 1: `vite.config.ts` を作成**

```typescript
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart({
      tsr: {
        routesDirectory: "./app/routes",
        generatedRouteTree: "./app/routeTree.gen.ts",
      },
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
      },
    }),
    viteReact(),
  ],
})
```

`autoSubfolderIndex: true` は spec の URL 互換性（`/<slug>/index.html` 形式 + 末尾スラッシュ）と整合する既定。`crawlLinks: true` で `__root.tsx` から辿れるリンクは自動 prerender されるが、Phase 1 ではまだリンクが無いため、後続タスクでトップページのみ生成されることを確認する。

注意: `tanstackStart()` の `tsr` オプションは Task 3 で作成した `tsr.config.json` と内容が重複している。これは保険であり、`tanstackStart()` 内部の router-plugin が `tsr.config.json` を自動で読む保証が無いバージョンに対する冗長化。インストールしたバージョンで `tsr` というキーが受け付けられない型エラーが出た場合は、`tanstackStart()` の引数から `tsr` ブロックだけ削除し、`tsr.config.json` のみで運用する。

`resolve.tsconfigPaths` の指定は Phase 1 のひな型では不要（既存 `@/*` alias を使うコードを `app/routes/` から呼ばないため）。Phase 2 で既存 `lib/posts.ts` を loader から呼ぶ段階で必要になったら、その時点で Vite のバージョンに応じて `resolve.tsconfigPaths: true`（Vite 8+）か `vite-tsconfig-paths` プラグイン（Vite 7 以下）を追加する。

- [ ] **Step 2: 構文チェック（依存解決のみ）**

Run: `pnpm exec vite --version`
Expected: バージョン番号で exit 0

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add vite config with tanstack start plugin and prerender enabled"
```

---

## Task 5: ルートレイアウト `app/routes/__root.tsx` の作成

**Files:**
- Create: `app/routes/__root.tsx`

- [ ] **Step 1: `app/routes/__root.tsx` を作成**

```tsx
/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import type { ReactNode } from "react"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "jaxx2104.info" },
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
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

注:
- `meta` は最小（charSet、viewport、title）。OGP / icon / manifest の移植は Phase 2 で行う
- `lang="ja"` は既存 `app/layout.tsx` と同じ
- フォント（Noto Sans JP / Permanent Marker）読み込みは Phase 3（CSS Modules / theme 移行）でまとめる

- [ ] **Step 2: Commit**

```bash
git add app/routes/__root.tsx
git commit -m "feat(routes): add tanstack root route with minimal head config"
```

---

## Task 6: トップページのプレースホルダ `app/routes/index.tsx`

**Files:**
- Create: `app/routes/index.tsx`

- [ ] **Step 1: `app/routes/index.tsx` を作成**

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomeStub,
  head: () => ({
    meta: [
      { title: "jaxx2104.info — Phase 1 stub" },
      {
        name: "description",
        content: "TanStack Start migration phase 1 placeholder",
      },
    ],
  }),
})

function HomeStub() {
  return (
    <main>
      <h1>jaxx2104.info</h1>
      <p>
        TanStack Start migration in progress (Phase 1). Real content will land
        in Phase 2.
      </p>
    </main>
  )
}
```

content は固定文字列。Phase 2 で `getAllPosts()`（lib/posts.ts のうち Velite を読む新実装）を loader から呼んで記事一覧に置換する。

- [ ] **Step 2: Commit**

```bash
git add app/routes/index.tsx
git commit -m "feat(routes): add stub home route to verify prerender pipeline"
```

---

## Task 7: ルーター生成エントリ `app/router.tsx`

`@tanstack/react-start` の SSR/prerender エントリは `routeTree.gen.ts` から `createRouter()` を呼ぶ。プラグイン側で自動的に解決されるが、明示的にエントリを置くことで Phase 2 以降の loader / context 注入が容易になる。

**Files:**
- Create: `app/router.tsx`

- [ ] **Step 1: `app/router.tsx` を作成**

```tsx
import { createRouter as createTanstackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/router.tsx
git commit -m "feat: add router factory for tanstack start"
```

---

## Task 8: `tsconfig.json` を `target: ES2022` に更新し routeTree を除外

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: 現状の tsconfig を確認**

Run: `cat tsconfig.json`
Expected: `target: "ES2017"` で、`include` に `app/**/*.tsx` などが含まれている

- [ ] **Step 2: `tsconfig.json` を以下に置換**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "styles/**/*.ts",
    "styles/**/*.tsx",
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "scripts/**/*.ts",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "public",
    ".cache",
    ".velite",
    ".tanstack",
    "dist",
    ".netlify",
    "velite.config.ts",
    "app/routeTree.gen.ts",
    "**/*.old/**/*",
    "**/*.bak/**/*"
  ]
}
```

差分:
- `target` を `ES2017` → `ES2022`
- `include` に `vite.config.ts` を追加
- `exclude` に `app/routeTree.gen.ts`、`dist`、`.netlify`、`.tanstack` を追加

`app/routeTree.gen.ts` を exclude するのは、初回 `vite build` 前は存在しないため。Phase 0 と同じく「生成ファイルは tsconfig に入れない、依存する側で個別 import する」ポリシー。

- [ ] **Step 3: 既存型チェックが通ることを確認**

Run: `pnpm test`
Expected: tsc が exit 0

エラーが出る場合:
- `target: ES2022` 化で旧 lib の互換警告が出ることはほぼ無い（DOM を使う）
- `app/routes/__root.tsx` に未解決 import があれば Task 5/6 の内容を確認
- ES2022 target で `Object.hasOwn` などの新 API を呼んでいるコードはたぶん無いが、もし型エラーが出たら個別対応

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json
git commit -m "chore(ts): bump target to ES2022 and exclude tanstack/vite generated files"
```

---

## Task 9: `next.config.mjs` の `ignoreBuildErrors` / `ignoreDuringBuilds` を撤廃

spec Phase 1 の `ignoreBuildErrors 相当を撤廃` を満たす。Next.js 本番ビルドが型エラーを正しく検出する状態に戻す。

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: 現状の `next.config.mjs` を確認**

Run: `cat next.config.mjs`
Expected:
```js
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```
が含まれている

- [ ] **Step 2: `next.config.mjs` を以下に置換**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  compiler: {
    styledComponents: true,
  },
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
}

export default nextConfig
```

差分:
- `eslint.ignoreDuringBuilds: true` を削除（Biome 移行（PR #679）で ESLint は外しているため、そもそもこのフラグは無意味）
- `typescript.ignoreBuildErrors: true` を削除

- [ ] **Step 3: Next.js 本番ビルドが通ることを確認**

Run: `pnpm build`
Expected: exit 0、`out/` 配下にページが生成される

エラーが出る場合（既存コードの型エラーが顕在化したケース）:
- `app/[...slug]/page.tsx`、`app/page.tsx`、`app/profile/page.tsx`、`lib/posts.ts` で型エラー → 修正（型のみ）
- `app/routes/**/*.tsx` で型エラー → Task 5〜7 の内容と React 18/19 のどちらでビルドしているかを確認
- 修正が大きくなるなら `next.config.mjs` の `typescript.ignoreBuildErrors: true` を一旦戻し、Task 9 を Phase 2 に持ち越す旨を Task 14（spec 更新）に書く

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "chore(next): drop ignoreBuildErrors and ignoreDuringBuilds flags"
```

---

## Task 10: pnpm scripts に Vite 用エントリを並立追加

既存の `pnpm dev` / `pnpm build` は Next.js のまま維持し、`pnpm dev:vite` / `pnpm build:vite` / `pnpm preview:vite` を別系統として追加する。

**Files:**
- Modify: `package.json`

- [ ] **Step 1: `package.json` の `scripts` を以下のキーで拡張**

既存キーは保持し、以下を追加:

```json
{
  "scripts": {
    "dev:vite": "vite dev",
    "build:vite": "pnpm velite:build && vite build",
    "preview:vite": "vite preview --port 4173"
  }
}
```

`build:vite` で `velite:build` を前段に置く理由は、後続 Phase で routeTree や loader が velite 出力を import するため、CI で velite 出力欠落をリグレッションさせない予防策。Phase 1 のひな型は velite 出力を直接参照しないが、依存順序を最初から正しくしておく。

- [ ] **Step 2: dev サーバーが起動することを確認**

Run: `pnpm dev:vite` をバックグラウンドで起動 → `curl -sf http://localhost:3000/ | head -20`
Expected: HTML が返る（タイトルに `jaxx2104.info` を含む）

確認後 `pkill -f 'vite dev'`（または起動した shell の Ctrl+C）でプロセスを止める

- [ ] **Step 3: prerender ビルドが完走することを確認**

Run: `pnpm build:vite`
Expected:
- `velite build` が exit 0
- `vite build` が exit 0
- `dist/index.html` が生成される
- prerender ログに `Rendered /` 相当のメッセージが出る

`dist/` の中身確認:

Run: `ls dist/`
Expected: `index.html`、`assets/` などが存在

Run: `grep -c 'Phase 1 stub' dist/index.html`
Expected: `1` 以上（Task 6 で書いた文字列が prerender 結果に含まれる）

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(scripts): add vite/tanstack dev/build/preview scripts alongside next"
```

---

## Task 11: `netlify.toml` でこのブランチの Preview のみ Vite ビルドに切替

main の本番ビルドは Next.js のまま（Phase 5 マージまで）。`netlify.toml` はブランチごとに評価されるため、このブランチで `pnpm build:vite` を指定すると、PR Preview のみ Vite 成果物が公開される。

**Files:**
- Create or Modify: `netlify.toml`

- [ ] **Step 1: 既存 `netlify.toml` の有無を確認**

Run: `cat netlify.toml 2>/dev/null || echo NOT_FOUND`
Expected: 既存設定の内容、または `NOT_FOUND`

- [ ] **Step 2: `netlify.toml` を以下に置換 / 新規作成**

```toml
# netlify.toml
#
# IMPORTANT: This file is committed on the modernize-stack-phase1 branch
# (and successor migration branches) so that Netlify Deploy Previews
# build the new TanStack Start output. The main branch's netlify.toml
# (or Netlify UI default) keeps building Next.js with `pnpm build`
# until the full migration merges in Phase 5.
#
# To verify which build runs on a given deploy, check the Netlify deploy
# log header: it should say `pnpm build:vite` for this branch.

[build]
  command = "pnpm build:vite"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
  PNPM_VERSION = "9.15.9"

# No SPA redirect: TanStack Start prerender emits real index.html files
# for every route. Add explicit _redirects later if needed.
```

`NODE_VERSION` は既存と整合（既存が無ければこれを基準）。`PNPM_VERSION` は `package.json` の `packageManager` フィールドに合わせる。

- [ ] **Step 3: Commit**

```bash
git add netlify.toml
git commit -m "ci: route phase 1 deploy preview through pnpm build:vite"
```

- [ ] **Step 4: ブランチを push して Netlify Preview を確認**

Run: `git push -u origin modernize-stack-phase1-tanstack-skeleton`
Expected: GitHub に push 完了

- [ ] **Step 5: PR を作成して Deploy Preview URL を確認**

Run: `gh pr create --draft --title "Phase 1: TanStack Start skeleton (modernize-stack)" --body "$(cat <<'EOF'
## Summary
- Bootstraps the TanStack Start skeleton (vite.config.ts, app/routes/__root.tsx, app/routes/index.tsx, app/router.tsx) per spec Phase 1
- Bumps tsconfig target to ES2022 and drops Next.js ignoreBuildErrors flags
- Adds pnpm dev:vite / build:vite / preview:vite alongside existing Next.js scripts
- Switches deploy preview build (this branch only) to pnpm build:vite

## Test plan
- [x] pnpm velite:build && pnpm verify:velite passes
- [x] pnpm test (tsc) passes
- [x] pnpm build (Next.js) passes
- [x] pnpm build:vite emits dist/index.html with the Phase 1 stub copy
- [ ] Netlify Deploy Preview renders the stub at the preview URL

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL が表示される。Netlify が Preview ビルドを開始

- [ ] **Step 6: Deploy Preview URL を開いて空ページを確認**

Run: `gh pr view --json statusCheckRollup,number,url`
Expected: Netlify の status check に Preview URL が含まれる

ブラウザで Preview URL を開く（または `curl -sf <preview-url>/ | grep -c 'Phase 1 stub'` で 1 以上）。

Gate 達成: Preview URL に「Phase 1 stub」の文言を含む空ページが表示されている。

失敗した場合:
- ビルドログ（`gh run view --log` または Netlify UI）を確認
- pnpm version mismatch → `[build.environment].PNPM_VERSION` を修正
- `vite build` が prerender で失敗 → `tanstackStart({ prerender: { failOnError: false } })` で一時的に warn のみにし、原因切り分け

---

## Task 12: CI ワークフローに Vite ビルドの smoke を追加

`.github/workflows/test.yml` に `pnpm build:vite` を追加し、TanStack Start ビルドが恒常的に動くことを保証する。Next.js ビルドのジョブはまだ削除しない。

**Files:**
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: 現状のワークフローを確認**

Run: `cat .github/workflows/test.yml`
Expected: `pnpm velite:build` → `pnpm test` → `pnpm verify:velite` の順で 3 ステップが並んでいる

- [ ] **Step 2: `pnpm verify:velite` の直後に Vite ビルド smoke を追加**

`.github/workflows/test.yml` の最終行（`pnpm verify:velite` のステップ）の後ろに以下を追記:

```yaml
      # NOTE: temporary smoke check during stack modernization Phase 1.
      # The 'Phase 1 stub' grep should be deleted together with the
      # placeholder copy in app/routes/index.tsx when Phase 2 lands.
      - name: Build vite (tanstack start prerender)
        run: pnpm build:vite

      - name: Verify dist artifacts
        run: |
          test -f dist/index.html
          grep -q 'Phase 1 stub' dist/index.html
```

`pnpm build:vite` は内部で `pnpm velite:build && vite build` を呼ぶため、Step 26〜27 の `pnpm velite:build` と二重実行になる。Phase 1 の暫定コストとして許容（Phase 2 で `pnpm verify:velite` を撤去する際に冗長分も整理）。

- [ ] **Step 3: ローカルで CI 相当を再現**

Run: `pnpm install --frozen-lockfile && pnpm test && pnpm velite:build && pnpm build:vite && grep -q 'Phase 1 stub' dist/index.html && echo OK`
Expected: `OK` が表示される

- [ ] **Step 4: Commit と push、CI 確認**

```bash
git add .github/workflows/test.yml
git commit -m "ci: smoke-test pnpm build:vite alongside existing tsc check"
git push
```

GitHub Actions の test ジョブが緑になることを確認:

Run: `gh run list --branch modernize-stack-phase1-tanstack-skeleton --limit 1`
Expected: 最新 run が `success`

CI が落ちた場合:
- `frozen-lockfile` 警告 → `pnpm-lock.yaml` を最新に
- `vite build` 失敗 → ローカルとの環境差を疑い、`NODE_VERSION` を Netlify と揃える
- どうしても解消しない場合は `pnpm build:vite` ステップだけ revert し、Phase 2 着手時に再導入する旨を Task 14 で spec に追記

---

## Task 13: 歴史的リネームスラッグの permalink ルックアップ設計を spec に固定

spec section 12「残課題」の項目「4 件の歴史的リネームスラッグ」について、Phase 1 のひな型では実装は不要だが、Phase 2 で `$.tsx`（splat ルート）の loader が `frontmatter.path`（= `permalink`）でルックアップする設計を Phase 1 のうちに spec に書き留めておく。これは「Phase 1 でルーター実装時に `permalink` フィールドを使って URL → 記事のルックアップを行う設計を確定させる」を満たす。

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: spec section 5「ルーティング設計」に permalink ルックアップの方針を追記**

`docs/superpowers/specs/2026-05-01-modernize-stack-design.md` の section 5 の表の直後（`prerender 戦略` の前）に、以下のサブセクションを追加:

```markdown
### Permalink ルックアップ（Phase 1 で確定）

`app/routes/$.tsx` の loader は、リクエスト URL を Velite 出力 `posts[].permalink` と完全一致で照合して該当記事を返す。`permalink` は `lib/content/schema.ts` の `transform` で `data.path ?? "/" + data.slug.split("/").pop() + "/"` として算出済み。

歴史的リネームの 4 件（`2017-08-04-listening-book → /readme-siri/`、`2018-11-15-smarthome-ph2 → /smarthome-xiaomi/`、`2019-05-07-googlehome-app-debut → /dialogflow-raspberrypi/`、`2025-01-23-syntax-highlight-test → /2025-01-23-syntax-highlight-test/`）も `permalink` を介してそのまま照合できる。slug ベースのルックアップは行わない。
```

末尾スラッシュは spec section 5 の URL 互換性方針（末尾スラッシュ付き）に合わせる。

- [ ] **Step 2: section 12 の「残課題」を更新**

「4 件の歴史的リネームスラッグ」の項目を「解消済み」に移し、本文を以下に置換:

```markdown
4. 歴史的リネームスラッグ 4 件: section 5 に記載の通り、`permalink` を一次キーとして loader でルックアップする方針を Phase 1 で確定。実装は Phase 2 で `app/routes/$.tsx` に。
```

「2 件の dead-image content gap」も「解消済み」に移し、Phase 1 Task 1 で content 側を修正済みであることを明記。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs(spec): pin permalink-based lookup design and clear phase 1 prerequisites"
```

---

## Task 14: Phase 1 完了マークと spec の更新

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: section 9 の Phase 1 見出しに完了マークを追加**

該当箇所（`### Phase 1: TanStack Start ひな型（1 日）`）を以下に書き換え:

```markdown
### Phase 1: TanStack Start ひな型（1 日）（完了: YYYY-MM-DD）

- `vite.config.ts`, `app/routes/__root.tsx`, `app/routes/index.tsx`, `app/router.tsx` を最小構成
- `prerender` を有効化、Netlify Deploy Preview で空ページを表示
- `tsconfig.json` を `target: ES2022` 化、`next.config.mjs` の `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` を撤廃
- `pnpm dev:vite` / `pnpm build:vite` を Next.js scripts と並立で追加
- 本ブランチの `netlify.toml` のみ `pnpm build:vite` に切替、main の本番ビルドは Next.js のまま維持
- **Gate 完了**: PR <番号> の Deploy Preview に Phase 1 stub のページが表示
```

`YYYY-MM-DD` と PR 番号は実行時の値で埋める。

React 19 に Phase 1 で前倒し bump した場合のみ、Phase 5 から「React 18 → 19」を削除し、本見出しの箇条書きに「React 18 → 19 へ前倒し（TanStack Start の peer dep 要求）」を追記。

- [ ] **Step 2: section 10「テスト / 検証戦略」の「段階的マージ」改訂注に Phase 1 の判断結果を追記**

「**改訂（2026-05-01）**: ...」の段落の末尾に追記:

```markdown
**Phase 1 完了時点の判断 (YYYY-MM-DD)**: 本フェーズは Next.js を残したまま TanStack Start ひな型を追加するのみで、Deploy Preview のみ Vite 成果物に切替えている。main の本番ビルドには影響しないが、Phase 2 で記事描画を loader に移すまで Vite 成果物には実コンテンツが無いため、**Phase 1 単独では main にマージしない**。Phase 2 と束ねて Preview レビューを受けたうえで判断する。
```

- [ ] **Step 3: Commit と PR を Ready for review に切替**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs(spec): mark phase 1 complete and pin merge strategy"
git push
gh pr ready
```

PR を draft → ready に変更し、レビュー依頼。

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec Phase 1 全項目のカバレッジ**
   - `vite.config.ts` 作成 → Task 4
   - `app/routes/__root.tsx` 作成 → Task 5
   - `app/routes/index.tsx` 作成 → Task 6
   - `prerender` 設定 → Task 4 (vite.config) + Task 10 (build:vite で実行)
   - Netlify Preview デプロイ動作確認 → Task 11
   - `tsconfig.json` の `target: ES2022` 化 → Task 8
   - `ignoreBuildErrors` 相当の撤廃 → Task 9
   - **Gate**: 空ページが Netlify Preview で表示 → Task 11 Step 6

2. **Spec section 12 の Phase 1 着手前タスク**
   - 2 件の dead-image content gap → Task 1
   - 4 件の歴史的リネームスラッグの設計確定 → Task 13

3. **placeholder 残留なし**: タスク内に "TBD"、"TODO"、"後で書く" が残っていないか

4. **型整合**:
   - `app/router.tsx` の `Register` declare module 型と `createRouter()` 戻り値が一致
   - `vite.config.ts` の `tanstackStart()` オプション名（`tsr`、`prerender`）が context7 で確認した API と一致
   - `tsconfig.json` の `exclude` に `app/routeTree.gen.ts` が入っており、`include` の `app/**/*.tsx` 経由で型エラーにならない

5. **シェルとパス整合**: fish 環境で `pnpm` 経由のコマンドが通ること、`$()` などの bash 依存記法を `gh pr create` 等以外で使っていないこと

6. **branch / merge 運用**:
   - 全 commit が `modernize-stack-phase1-tanstack-skeleton` ブランチ上にある
   - main の `netlify.toml` には Phase 1 の変更が及んでいない（このブランチのみ commit されている）
   - PR は draft → Ready の順で運用

7. **本番影響ゼロの確認**: Task 9 で `pnpm build`（Next.js）が成功している。main を pull してきても本番デプロイは引き続き Next.js 成果物（`out/`）を配信
