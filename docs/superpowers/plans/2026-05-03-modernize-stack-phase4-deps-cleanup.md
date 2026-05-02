# Stack Modernization Phase 4: 旧依存撤去 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 0 で導入した Velite/legacy cross-check と、Phase 1〜3 で TanStack Start + CSS Modules に置換した結果すでに参照されていない Next.js / Helmet / lazyload / font-awesome v4 / mdx / localforage 系の旧依存と関連ファイルを撤去し、`pnpm install` 後に build / 型チェック / Biome がすべて緑になる状態に整える。

**Architecture:** 削除は 3 つのレイヤで段階的に行う。(1) **Velite cross-check 撤去** — `lib/posts-legacy.ts`、`scripts/verify-velite.ts`、`package.json` の `verify:velite`、CI の対応 step を一括削除し、cross-check で生きていた `lib/image-utils.ts` も orphan になるので消す。(2) **Next.js 残骸撤去** — `next.config.mjs` / `next-env.d.ts` を削除し、`package.json` の `dev:next` / `build:next` / `dev:vite` / `build:vite` / `preview:vite` の重複・退避 scripts を削除して、CI workflow の `pnpm build:vite` を `pnpm build` に切替える。`build.sh` のブランチ分岐は Phase 5 で扱うため触らない。(3) **未使用 dependency の package.json 削除** — Task 1〜2 の削除でファイル参照が完全に切れた deps と、Phase 2/3 で参照を切ってあったものを `pnpm remove` でまとめて落とす。各タスクの末尾で `pnpm test && pnpm build && pnpm lint:ci` を実行し、依存切断と未参照確認を同時に行う。

**Tech Stack:** pnpm 9, Vite 8, TanStack Start 1.x, Velite 0.3, Biome 2.4, TypeScript 5.8

---

## File Structure

### Delete
- `lib/posts-legacy.ts` — Phase 0 から残る filesystem-backed reader。Velite cross-check 専用に退避してあったが、Phase 4 で役目終了
- `scripts/verify-velite.ts` — Velite と legacy の slug/title 突き合わせ scripts。同上
- `lib/image-utils.ts` — `posts-legacy.ts` からのみ参照されており、Task 1 完了時点で orphan 化
- `next.config.mjs` — Next.js 設定。Phase 2 でランタイム切替済み
- `next-env.d.ts` — Next.js 型定義。同上

### Modify
- `package.json` — `scripts.verify:velite` / `scripts.dev:next` / `scripts.build:next` / `scripts.dev:vite` / `scripts.build:vite` / `scripts.preview:vite` を削除。`dependencies` / `devDependencies` から旧依存を一括削除
- `pnpm-lock.yaml` — `pnpm install` で自動更新
- `.github/workflows/test.yml` — `Verify velite output matches legacy` step を削除し、`Build content layer + tanstack start prerender` step の `pnpm build:vite` を `pnpm build` に変更
- `app/routes/__root.tsx` — `import "font-awesome/css/font-awesome.css"` を削除（v6 の `<FontAwesomeIcon>` が SVG ベースで描画するため v4 CSS は不要）
- `tsconfig.json` — `velite.config.ts` を `exclude` に置いている経緯コメント／合理性を再確認（Phase 0 ノートで再評価予定とされていた）
- `CLAUDE.md` — `pnpm verify:velite` 行を削除
- `lib/CLAUDE.md` — Data Flow 節の `lib/posts.ts` 周辺記述を Velite 直結のみに整理（legacy への言及があれば削除）
- `docs/superpowers/specs/2026-05-01-modernize-stack-design.md` — Phase 4 の Gate 完了を追記

### Untouched (Phase 5 で対応)
- `build.sh` のブランチ分岐撤去 — spec section 9 Phase 5
- React 18 → 19 アップグレード — spec section 9 Phase 5
- `package.json` の `description` 修正 — spec section 9 Phase 5
- `@fortawesome/*`, `react-share`, `modern-normalize`, `shiki`, `rehype-pretty-code`, `gray-matter`, `hast-util-from-html`, `open-graph-scraper`, `unist-util-visit`, `@types/hast`, `sharp` — 現役で参照されているため触らない

---

## Conventions

- 削除タスクごとに 1 commit。途中の各 commit で `pnpm test && pnpm build && pnpm lint:ci` がすべて exit 0 を返すことを確認する（壊れた中間状態を残さない）
- `pnpm remove <pkg>...` を使い、`package.json` を手書きで編集しない（lockfile が自動更新され、整合性が保たれる）
- 削除後の grep 検証は `--include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml"` で `node_modules` / `.velite` / `dist` / `.git/` を除外したうえで「想定外参照ゼロ」を確認する
- ブランチ命名は spec の慣習に揃え `modernize-stack-phase4` とする

---

## Task 1: ブランチ準備 + Velite cross-check 撤去

cross-check 系（`lib/posts-legacy.ts`、`scripts/verify-velite.ts`、`package.json` の `verify:velite`、CI の対応 step）を一括で削除する。Phase 0 から「Phase 4 で削除」と各所にコメントしてある最大の塊。

**Files:**
- Delete: `lib/posts-legacy.ts`
- Delete: `scripts/verify-velite.ts`
- Modify: `package.json`
- Modify: `.github/workflows/test.yml`
- Modify: `CLAUDE.md`

- [ ] **Step 1: 専用ブランチを切る**

Run: `git fetch -p origin && git checkout -b modernize-stack-phase4 origin/main`
Expected: 新ブランチに切り替わり、`origin/main` の最新（`7fb2fa5 Phase 1+2+3` 以降）を起点にしている

- [ ] **Step 2: legacy reader と verify script を削除**

Run: `git rm lib/posts-legacy.ts scripts/verify-velite.ts`
Expected: 2 ファイルが working tree から消え staged になる

- [ ] **Step 3: `package.json` の `verify:velite` script を削除**

`package.json` の `scripts` ブロックから次の 1 行を削除:

```json
    "verify:velite": "tsx scripts/verify-velite.ts",
```

削除後、`scripts` ブロックは以下の状態になっていること（順序保持）:

```json
  "scripts": {
    "dev": "vite dev",
    "build": "pnpm velite:build && vite build",
    "start": "vite preview --port 4173",
    "deploy": "pnpm build",
    "velite": "velite",
    "velite:build": "velite build",
    "velite:dev": "velite dev",
    "inspect:paths": "tsx scripts/inspect-paths.ts",
    "format": "biome format --write .",
    "lint": "biome check --write .",
    "lint:ci": "biome ci .",
    "lint:text": "textlint content/**/index.md",
    "lint:textfix": "textlint --fix content/**/index.md",
    "test": "tsc -p ./tsconfig.json",
    "dev:vite": "vite dev",
    "build:vite": "pnpm velite:build && vite build",
    "preview:vite": "vite preview --port 4173",
    "dev:next": "next dev",
    "build:next": "next build"
  },
```

> 注: `dev:next` / `build:next` / `dev:vite` / `build:vite` / `preview:vite` は Task 3 で削除する。本タスクでは触らない。

- [ ] **Step 4: CI workflow から verify:velite step を削除**

`.github/workflows/test.yml` の以下 4 行（コメント 2 行 + step 2 行）を削除:

```yaml
      # NOTE: temporary cross-check during stack modernization Phase 0.
      # Remove together with lib/posts.ts legacy reader in Phase 4.
      - name: Verify velite output matches legacy
        run: pnpm verify:velite
```

削除後、`pnpm test` の直下が「Verify dist artifacts (phase 2 routes + OGP)」step になっていることを確認。

- [ ] **Step 5: `CLAUDE.md` から `verify:velite` 行を削除**

`CLAUDE.md` の Code Quality セクション内の以下 1 行を削除:

```markdown
pnpm verify:velite       # Cross-check Velite output against legacy reader (Phase 4 で削除予定)
```

- [ ] **Step 6: 残存参照ゼロを確認**

Run: `grep -rn "posts-legacy\|verify:velite\|verify-velite" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.yml" --include="*.yaml" . 2>/dev/null | grep -v node_modules | grep -v .velite | grep -v ./.git/ | grep -v dist/ | grep -v 'docs/superpowers/'`
Expected: 出力ゼロ（`docs/superpowers/` 配下の過去 plan/spec への言及は履歴として残してよい）

- [ ] **Step 7: 静的検査一式を実行**

Run: `pnpm install && pnpm velite:build && pnpm test && pnpm lint:ci`
Expected: 4 コマンドすべて exit 0
- `pnpm install`: lockfile に変更がないこと（Step 2〜5 ではまだ deps を削除していない）
- `pnpm velite:build`: `.velite/posts.json` が生成され「entries 109」前後
- `pnpm test`: tsc が `posts-legacy.ts` を見つけられないなどのエラーなく完走
- `pnpm lint:ci`: Biome が削除済みファイルへの参照エラーを出さない

失敗した場合:
- `pnpm test` が `Cannot find module '../lib/posts-legacy'` を出す → 残存参照を Step 6 の grep で再確認、`.tsbuildinfo` を削除して再実行（`rm tsconfig.tsbuildinfo`）
- `pnpm lint:ci` が `verify-velite.ts` の path を引いている → Biome の `vcs.useIgnoreFile` 設定により `git rm` 済みなら走らないはず。念のため `pnpm lint:ci -- --diagnostic-level=error` で警告と区別

- [ ] **Step 8: Commit**

```bash
git add lib/posts-legacy.ts scripts/verify-velite.ts package.json .github/workflows/test.yml CLAUDE.md
git commit -m "chore: drop velite/legacy cross-check now that velite is the sole reader"
```

---

## Task 2: orphan になった `lib/image-utils.ts` を削除

`lib/image-utils.ts` は `lib/posts-legacy.ts` 専用ヘルパだった（`processImagePath` を `posts-legacy.ts:14` でのみ import）。Task 1 完了時点で参照ゼロのはず。確認のうえ削除する。

**Files:**
- Delete: `lib/image-utils.ts`
- Modify: `lib/CLAUDE.md`

- [ ] **Step 1: `image-utils` への参照ゼロを確認**

Run: `grep -rn "image-utils" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v .velite | grep -v ./.git/ | grep -v dist/ | grep -v 'docs/superpowers/'`
Expected: 出力ゼロ

ヒットがある場合は Task 1 が完了していないか、別経路の参照が残っている。深堀りしてから本タスクを進める。

- [ ] **Step 2: ファイル削除**

Run: `git rm lib/image-utils.ts`
Expected: 1 ファイルが staged

- [ ] **Step 3: `lib/CLAUDE.md` から `image-utils.ts` 節を削除**

`lib/CLAUDE.md` の以下ブロックを削除:

```markdown
### `image-utils.ts` - Image Processing
記事内の画像を base64 data URI に変換。

- 静的エクスポート互換性のため
- ローカル画像パスを検出して変換
```

(冒頭で `posts.ts - Blog Post Data` 節の説明が「画像は base64 data URI に変換（`image-utils.ts` 使用）」と書かれていれば、その記述も Velite のフラット URL 出力（`velite.config.ts` の `assets` / `base` / `name` 設定で `public/images/posts/<name>-<hash>.<ext>` を生成）に置換する。)

具体的には `posts.ts - Blog Post Data` ブロックの末尾「画像は base64 data URI に変換（`image-utils.ts` 使用）」を以下に置換:

```markdown
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照
```

- [ ] **Step 4: 静的検査**

Run: `pnpm test && pnpm lint:ci`
Expected: 両方 exit 0

- [ ] **Step 5: Commit**

```bash
git add lib/image-utils.ts lib/CLAUDE.md
git commit -m "chore: remove orphan image-utils helper (was only used by legacy reader)"
```

---

## Task 3: Next.js 設定ファイルと退避 scripts の撤去

`next.config.mjs` と `next-env.d.ts` を削除し、`package.json` から Next.js / Vite 退避 scripts を消す。CI の `build:vite` 参照を `build` に切替える。`build.sh` のブランチ分岐は Phase 5 までは維持する（main がまだ Next.js を持つ可能性に備え、無害な土台として残す）。

**Files:**
- Delete: `next.config.mjs`
- Delete: `next-env.d.ts`
- Modify: `package.json`
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: Next.js 設定ファイルを削除**

Run: `git rm next.config.mjs next-env.d.ts`
Expected: 2 ファイルが staged

- [ ] **Step 2: `package.json` の Next.js / Vite 重複 scripts を削除**

`package.json` の `scripts` ブロックから次の 5 行を削除:

```json
    "dev:vite": "vite dev",
    "build:vite": "pnpm velite:build && vite build",
    "preview:vite": "vite preview --port 4173",
    "dev:next": "next dev",
    "build:next": "next build"
```

削除後、`scripts` ブロックは以下の状態になっていること:

```json
  "scripts": {
    "dev": "vite dev",
    "build": "pnpm velite:build && vite build",
    "start": "vite preview --port 4173",
    "deploy": "pnpm build",
    "velite": "velite",
    "velite:build": "velite build",
    "velite:dev": "velite dev",
    "inspect:paths": "tsx scripts/inspect-paths.ts",
    "format": "biome format --write .",
    "lint": "biome check --write .",
    "lint:ci": "biome ci .",
    "lint:text": "textlint content/**/index.md",
    "lint:textfix": "textlint --fix content/**/index.md",
    "test": "tsc -p ./tsconfig.json"
  },
```

- [ ] **Step 3: CI workflow の `pnpm build:vite` を `pnpm build` に変更**

`.github/workflows/test.yml` 内の以下 step を:

```yaml
      # Build velite + vite (TanStack Start prerender) BEFORE tsc.
      # vite build generates app/routeTree.gen.ts which app/router.tsx
      # imports; without this step tsc fails with TS2307. velite output is
      # also required by scripts/verify-velite.ts type-checking.
      - name: Build content layer + tanstack start prerender
        run: pnpm build:vite
```

以下に置換:

```yaml
      # Build velite + vite (TanStack Start prerender) BEFORE tsc.
      # vite build generates app/routeTree.gen.ts which app/router.tsx
      # imports; without this step tsc fails with TS2307.
      - name: Build content layer + tanstack start prerender
        run: pnpm build
```

> 注: コメント末尾の `velite output is also required by scripts/verify-velite.ts type-checking.` は Task 1 で `verify-velite.ts` を消したので削除する（残しておくと未来の読者が「verify-velite ってどこ？」と混乱する）。

- [ ] **Step 4: 残存 Next.js 参照ゼロを確認**

Run: `grep -rn "next.config\|next-env\|build:vite\|build:next\|dev:vite\|dev:next\|preview:vite" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v .velite | grep -v ./.git/ | grep -v dist/ | grep -v 'docs/superpowers/'`
Expected: `build.sh` 内の説明コメントのみがヒット可（実コードの参照ゼロ）。残りはゼロ

`build.sh` のコメントは Phase 5 で書き換えるため本タスクでは触らない。

- [ ] **Step 5: ビルド + 型チェック**

Run: `pnpm install && pnpm build && pnpm test && pnpm lint:ci`
Expected: 4 コマンドすべて exit 0
- `pnpm build`: `dist/client/index.html` 等が生成される
- `pnpm test`: `next-env.d.ts` が消えても tsc が通る（Phase 1 で `tsconfig.json.include` から `next-env.d.ts` は外している前提。残っている場合は本タスクで `include` 配列からも除去する）

失敗した場合:
- `pnpm test` が `Cannot find type definition file for 'next'` を出す → `tsconfig.json` の `include` 配列に `next-env.d.ts` が残っている。該当行を削除して再実行
- `pnpm test` が `.next/types/routes.d.ts` が見つからない旨を出す → `tsconfig.json` の `exclude` に `.next` が入っているはずだが、`include` のどこかに `.next/types/**/*.ts` が残っている可能性。確認して削除

- [ ] **Step 6: Commit**

```bash
git add next.config.mjs next-env.d.ts package.json .github/workflows/test.yml tsconfig.json
git commit -m "chore: remove next.js config files and stash scripts"
```

> 注: `tsconfig.json` を実際に変更しなければ `git add tsconfig.json` は no-op になるが、念のため `git add` で staged に上げる。

---

## Task 4: `font-awesome` v4 CSS 撤去

`app/routes/__root.tsx:12` の `import "font-awesome/css/font-awesome.css"` を削除する。アイコン描画は `components/icons/icon.tsx` の `<FontAwesomeIcon>` (v6 SVG) で完結しており、v4 CSS（`<i class="fa fa-...">` 形式）は誰も使っていないため。

**Files:**
- Modify: `app/routes/__root.tsx`

- [ ] **Step 1: `<i class="fa">` 形式の参照ゼロを確認**

Run: `grep -rn 'class="fa\|className=".*\bfa\b\|className={.*\bfa\b' --include="*.ts" --include="*.tsx" --include="*.css" --include="*.module.css" components/ app/ styles/ 2>/dev/null`
Expected: 出力ゼロ。`fa-` プレフィックスのクラス名を `<i>` などに当てている箇所が無いこと

ヒットがある場合は本タスクをスキップし、別タスクとして「v4 → v6 への置換」を起こす（spec section 2 と整合性を取るために要レビュー）。

- [ ] **Step 2: import 行を削除**

`app/routes/__root.tsx` の以下 1 行を削除:

```typescript
import "font-awesome/css/font-awesome.css"
```

削除後、`__root.tsx` の冒頭 import 群は以下の順序になる:

```typescript
/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import "modern-normalize/modern-normalize.css"
import "@/styles/tokens.css"
import "@/styles/global.css"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"
import { ThemeProvider } from "@/lib/ThemeContext"
```

- [ ] **Step 3: ビルド + 型チェック**

Run: `pnpm build && pnpm test && pnpm lint:ci`
Expected: 3 コマンドすべて exit 0

- [ ] **Step 4: ローカルでアイコン描画を目視確認**

Run: `pnpm start`
別ターミナルで `open http://localhost:4173/profile/`
Expected:
- プロフィールページに表示される SNS / 技術スタックのアイコン群（Twitter / GitHub / Apple / AWS / etc.）が SVG として正しく描画されている
- DevTools で `<i class="...">` の中に `<svg>` が入っていること（v6 の `<FontAwesomeIcon>` は `<svg>` を生成する）
- アイコンが「四角の空白」になっている場合は v4 CSS に依存していた可能性。dev tools で該当要素のスタイルを確認

問題があった場合: import を巻き戻し、別 PR で `<FontAwesomeIcon>` への置換を計画してから再挑戦する。

- [ ] **Step 5: Commit**

```bash
git add app/routes/__root.tsx
git commit -m "chore: drop unused font-awesome v4 css (icons render via @fortawesome v6 svg)"
```

---

## Task 5: 旧 dependencies の package.json 削除

Task 1〜4 で参照を完全に切った deps と、Phase 2/3 で参照ゼロになっていた deps をまとめて `package.json` から外す。`pnpm remove` を使い lockfile を一貫させる。

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`（自動）

- [ ] **Step 1: 削除予定の各 dep に対して参照ゼロを確認**

以下 1 コマンドで一括確認（fish 環境でもそのまま走るよう `bash -c` で囲む）:

```fish
bash -c 'for pkg in next @next/mdx @mdx-js/loader @mdx-js/react react-helmet @types/react-helmet react-lazyload font-awesome localforage remark remark-html remark-parse remark-rehype unified rehype-stringify; do
  count=$(grep -rn "from \"${pkg}\"\|from '"'"'${pkg}'"'"'\|require(['"'"'\"]${pkg}['"'"'\"])\|import \"${pkg}\|import '"'"'${pkg}" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.cjs" \
    . 2>/dev/null | grep -v node_modules | grep -v .velite | grep -v ./.git/ | grep -v dist/ | wc -l)
  echo "${pkg}: ${count}"
done'
```

Expected: 全 pkg が `0` で出力される

> 注: `font-awesome` は Task 4 で import を消したのでゼロのはず。`@fortawesome/*`（v6）は別パッケージなのでこの grep にはヒットしない。

ヒットがあった dep は本タスクの削除リストから外し、残置した理由を Step 6 のコミットメッセージに明記する。

- [ ] **Step 2: 一括 remove**

Run:

```bash
pnpm remove \
  next @next/mdx @mdx-js/loader @mdx-js/react \
  react-helmet @types/react-helmet \
  react-lazyload \
  font-awesome \
  localforage \
  remark remark-html remark-parse remark-rehype unified rehype-stringify
```

Expected: `package.json` の `dependencies` / `devDependencies` から該当 pkg が消え、`pnpm-lock.yaml` が自動更新される

- [ ] **Step 3: 想定通りの `package.json` になっていることを確認**

`package.json` の `dependencies` は以下の状態になる（順序は pnpm remove で並び替わる可能性あり）:

```json
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "6.7.2",
    "@fortawesome/free-brands-svg-icons": "6.7.2",
    "@fortawesome/react-fontawesome": "0.2.6",
    "@tanstack/react-router": "^1.169.1",
    "@tanstack/react-start": "^1.167.57",
    "date-fns": "^4.1.0",
    "gray-matter": "^4.0.3",
    "hast-util-from-html": "^2.0.3",
    "modern-normalize": "3.0.1",
    "open-graph-scraper": "^6.11.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-share": "5.2.2",
    "rehype-pretty-code": "^0.14.1",
    "shiki": "^3.13.0",
    "unist-util-visit": "^5.0.0"
  },
```

`devDependencies` は以下:

```json
  "devDependencies": {
    "@biomejs/biome": "2.4.13",
    "@tanstack/router-plugin": "^1.167.31",
    "@types/hast": "^3.0.4",
    "@types/node": "^22.7.5",
    "@types/react": "^18.3.11",
    "@vitejs/plugin-react": "^6.0.1",
    "sharp": "^0.34.4",
    "textlint": "15.5.0",
    "textlint-filter-rule-comments": "^1.2.2",
    "textlint-rule-no-mix-dearu-desumasu": "^6.0.4",
    "textlint-rule-preset-ai-writing": "1.1.0",
    "textlint-rule-preset-ja-spacing": "2.4.3",
    "textlint-rule-preset-japanese": "5.0.0",
    "tsx": "^4",
    "typescript": "5.8.2",
    "velite": "^0.3",
    "vite": "^8.0.10"
  },
```

差分があった場合（pnpm remove が想定外の dep を残した／消した）は Step 1 の grep 結果と突き合わせて原因を特定する。

- [ ] **Step 4: クリーンインストール + ビルド + 型チェック**

Run:

```bash
rm -rf node_modules .velite dist tsconfig.tsbuildinfo
pnpm install
pnpm build
pnpm test
pnpm lint:ci
```

Expected: 5 コマンドすべて exit 0
- `pnpm install`: lockfile と整合
- `pnpm build`: `velite build` → `vite build` の順で `dist/client/` が生成
- `pnpm test`: tsc がエラーなく完走
- `pnpm lint:ci`: Biome がエラー / 警告なし

失敗した場合:
- `Cannot find module '<pkg>'` → Step 1 の grep で見落としていた参照が残っている。`grep -rn "<pkg>" --include="*.ts" --include="*.tsx" .` で再特定し、参照ファイルを修正したうえで本タスクを再開
- ビルドが peer dependency 警告で落ちる → 削除した dep が他 dep の peer になっていた可能性。`pnpm install` のログで該当 peer を確認し、必要なら delete リストから外して revert

- [ ] **Step 5: prerender 出力数の回帰確認**

Run: `find dist/client -name index.html | wc -l`
Expected: `111` 以上（CI workflow と同じ閾値。Phase 2 完了時点で 111 件超）

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: drop next.js, mdx, helmet, lazyload, fontawesome v4, localforage, legacy markdown deps"
```

---

## Task 6: tsconfig.json の `velite.config.ts` exclude を再評価

spec section 12 / Phase 0 ノートに「`velite.config.ts` の tsconfig exclude と `@ts-expect-error` は Phase 4 で `lib/posts.ts` と一緒に再評価する」とある。`scripts/verify-velite.ts` を Task 1 で削除したことで、`.velite/index.d.ts` を type-import する経路が無くなった可能性がある。実際に `velite.config.ts` を `exclude` から外してビルドが通るかを試す。

**Files:**
- Modify: `tsconfig.json`（試行の結果次第）

- [ ] **Step 1: 現状の `tsconfig.json` の `exclude` を確認**

`tsconfig.json` の `exclude` 配列は以下のはず（Phase 4 Task 3 までで `next-env.d.ts` 関連が残っていれば併せて掃除済み）:

```json
  "exclude": [
    "node_modules",
    "public",
    ".cache",
    ".velite",
    ".tanstack",
    "dist",
    ".netlify",
    ".next",
    "velite.config.ts",
    "app/routeTree.gen.ts",
    "**/*.old/**/*",
    "**/*.bak/**/*"
  ]
```

- [ ] **Step 2: `velite.config.ts` を exclude から外して試す**

`tsconfig.json` の `exclude` 配列から `"velite.config.ts"` を 1 行削除。

- [ ] **Step 3: 型チェック**

Run: `pnpm velite:build && pnpm test`
Expected: tsc が exit 0

成功した場合:
- そのまま削除を確定し Step 5 へ進む

失敗した場合（spec のコメント通り `.velite/index.d.ts` 経由で `velite.config.ts` が pulled in されてエラーが再発する場合）:
- `pnpm test` のエラーメッセージを記録（最低限の TS error code と該当ファイル/行）
- `tsconfig.json` を Step 2 の前に戻す（`git checkout tsconfig.json`）
- `velite.config.ts` の冒頭に経緯コメントを追記し、なぜ exclude が必要かを Phase 0 ノートと結びつける形で残す:

```typescript
// NOTE: this file is excluded from project tsconfig in tsconfig.json.
// Reason: velite emits .velite/index.d.ts that re-imports velite.config.ts
// via `import type`, which transitively pulls this file back into the tsc
// program if included. Excluding it avoids TS errors in a config file that
// is only consumed by the velite CLI, not the runtime app. See
// docs/superpowers/specs/2026-05-01-modernize-stack-design.md section 12.
```

- [ ] **Step 4: 静的検査一式**

Run: `pnpm test && pnpm lint:ci`
Expected: 両方 exit 0

- [ ] **Step 5: Commit**

成功（exclude を外せた）した場合:

```bash
git add tsconfig.json
git commit -m "chore(tsconfig): drop velite.config.ts from exclude (no longer needed after legacy reader removal)"
```

失敗（exclude を残した場合）でコメント追記のみ:

```bash
git add velite.config.ts
git commit -m "docs(velite): document why velite.config.ts stays in tsconfig exclude"
```

---

## Task 7: Phase 4 完了レポートを spec に追記し PR を準備

spec の Phase 4 セクションに Gate 完了を追記し、Phase 5 で残るタスクを明示する。

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: Phase 4 セクションに完了マーカーを追記**

`docs/superpowers/specs/2026-05-01-modernize-stack-design.md` の `### Phase 4: 旧依存撤去（半日）` 見出しを `### Phase 4: 旧依存撤去（半日）（完了: 2026-05-03）` に変更。

末尾の `**Gate**: pnpm install 後にビルド・型チェック・Biome すべて通る` の直後に以下を追記:

```markdown
- **Gate 完了**: 2026-05-03 時点で
  - `lib/posts-legacy.ts` / `scripts/verify-velite.ts` / `lib/image-utils.ts` / `next.config.mjs` / `next-env.d.ts` を削除
  - `package.json` から `next`, `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `react-helmet`, `@types/react-helmet`, `react-lazyload`, `font-awesome`, `localforage`, `remark`, `remark-html`, `remark-parse`, `remark-rehype`, `unified`, `rehype-stringify` を撤去
  - `package.json` の `verify:velite` / `dev:next` / `build:next` / `dev:vite` / `build:vite` / `preview:vite` scripts を削除
  - `app/routes/__root.tsx` から font-awesome v4 CSS import を削除（v6 SVG レンダリングで完結）
  - CI（`.github/workflows/test.yml`）から `Verify velite output matches legacy` step を削除、`pnpm build:vite` → `pnpm build` に切替
  - クリーンインストール (`rm -rf node_modules .velite dist && pnpm install`) 後、`pnpm build && pnpm test && pnpm lint:ci` がすべて exit 0
  - `dist/client/` の prerender 件数が 111 以上で維持
```

`tsconfig` の `velite.config.ts` exclude を Task 6 で外せた場合は、12 章「Phase 0 ノート」の該当項目も「Phase 4 で削除済み」に書き換える。外せなかった場合は「Phase 4 で再評価し恒久的に exclude を維持する判断、velite.config.ts に経緯コメントを追記」と書き換える。

- [ ] **Step 2: Phase 5 残タスクを spec に確認・追記**

`### Phase 5: 仕上げ（半日〜1 日）` セクションに以下が含まれていることを確認。欠けていれば追記:

- React 18 → 19
- `tsc -p .` を CI で必須化（既に Phase 4 時点で test job に組み込まれているはず）
- `build.sh` のブランチ分岐撤去
- `package.json` の `description` を実態に修正
- バンドルサイズ / 初回ロード時間の Phase 2 比計測

- [ ] **Step 3: 最終クリーンビルドで全 Gate 確認**

Run:

```bash
rm -rf node_modules .velite dist tsconfig.tsbuildinfo
pnpm install
pnpm build
pnpm test
pnpm lint:ci
pnpm lint:text
```

Expected: すべて exit 0

`pnpm lint:text` は記事本文の textlint。Phase 4 のスコープ外だが、PR を出す前に最後に通しておく。

- [ ] **Step 4: ブランチを push**

Run: `git push -u origin modernize-stack-phase4`
Expected: GitHub Actions の Lint / Test ジョブが緑になる

CI が落ちた場合:
- `Verify dist artifacts (phase 2 routes + OGP)` step が `php-replace-lf/index.html` 等を見つけられない → `pnpm build` が prerender に失敗している可能性。手元で `pnpm build` の最終出力（特に warnings）を読み直す
- Lint job が落ちる → 手元で `pnpm lint:ci` を再実行

- [ ] **Step 5: Commit + PR**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs: record phase 4 completion in modernize-stack spec"
git push
```

PR 作成は jaxx-pr スキル（または `gh pr create`）で本ブランチから main に向けて。タイトル例: `Phase 4: drop legacy reader and obsolete next/helmet/lazyload deps (modernize-stack)`。本文には Gate 完了内容と Task 1〜6 の commit リスト（`git log --oneline origin/main..HEAD`）を貼る。

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec Phase 4 全 Gate のカバレッジ**
   - `next`, `@next/mdx`, `react-helmet`, `react-lazyload`, `font-awesome`, `@types/react-helmet` の削除 → Task 5 でカバー
   - `next.config.mjs`, `next-env.d.ts` の削除 → Task 3 でカバー
   - `image-utils.ts` の削除 → Task 2 でカバー
   - `react-lazyload` 利用箇所の `loading="lazy"` 置換 → Phase 2 で前倒し済み（spec section 9 line 262 で確認）。本フェーズでは dep 削除のみ
   - `pnpm install` 後のビルド・型チェック・Biome → Task 5 / Task 7 でカバー

2. **placeholder 残留なし**
   - "TBD"、"TODO"、"後で書く"、"後ほど" がプラン本文にゼロであること

3. **削除順序の依存関係**
   - Task 1 (posts-legacy 削除) → Task 2 (image-utils 削除) の順序が守られているか（image-utils は posts-legacy 経由でしか参照されていない）
   - Task 4 (font-awesome import 削除) → Task 5 (font-awesome dep 削除) の順序が守られているか

4. **CI workflow の整合**
   - Task 1 で `Verify velite output matches legacy` step を削除し、Task 3 で `pnpm build:vite` → `pnpm build` に切替えている。CI が Task 1 完了時点で「`build:vite` が削除されていないのに `verify:velite` を呼んで落ちる」状態にならないこと（順序: 削除 → push）

5. **Branch / Git 運用**
   - 全 commit 前に `git fetch -p origin && git checkout -b modernize-stack-phase4 origin/main` でブランチを切ってから作業しているか（Task 1 Step 1）
   - 各 Task 末尾で個別 commit を作成しており、中間状態でも `pnpm test && pnpm build && pnpm lint:ci` が緑

6. **fish shell との互換**
   - すべての shell コマンドが POSIX/fish で同等に動く（Task 5 Step 1 の `for ... do ... done` は bash 構文。fish では `for pkg in ...; ...; end` だが、`bash -c '...'` で囲むか、Step 1 を bash で実行する旨を補足する）

7. **Phase 5 への引き継ぎ事項が明文化されているか**
   - `build.sh` のブランチ分岐撤去（spec section 9 Phase 5）
   - React 18 → 19 アップグレード
   - `package.json` の `description` 修正
