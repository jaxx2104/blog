# Stack Modernization Phase 3: スタイル全面置換（CSS Modules + CSS variables） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2 でランタイム実行のまま残した styled-components を全廃し、CSS Modules + CSS variables（`[data-theme]` 切替）に置換する。Phase 2 で `<head>` に仕込んだインライン theme bootstrap script が、Phase 3 で初めて「テーマを CSS variable 経由で切替える」効果を発揮する。Cloudflare Pages Deploy Preview 上で、Phase 2 と同じ Vite 成果物（`dist/client/`）から **FOUC が消え、ダークモード切替が `<html data-theme>` の差し替えだけで完了する**状態にする。styled-components dependency と styles/global-style.ts / styles/theme.ts も本フェーズで削除する。

**Architecture:**
1. テーマトークンは `styles/tokens.css` に CSS custom property として定義し、`:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セットを置く。spec section 7 の例（`--color-bg` / `--color-text` / `--color-primary` / `--color-muted` / `--color-border` 等）を踏襲しつつ、現行 `styles/theme.ts` の `colorMain` / `colorSub` / `colorAccent` / `colorText` / `colorBackground` / `colorBorder` / `colorShadow` および font-size 系 (`--font-size-*`)、`--content-width`、`--font-weight-bold` を**全て**移し替える。互換性のため命名は新規（`--color-*` / `--font-size-*` / `--font-weight-*`）に統一し、コンポーネント側は new naming のみを参照する（旧 theme オブジェクトキーへの参照は全て消える）。
2. グローバル CSS は `styles/global.css` に分離する。現行 `styles/global-style.ts` の `body` / `a` / `ul,ol,li` / `.content` 配下（`h1-h6`、`p`、`blockquote`、`img`、`pre`、`code:not(pre code)`、`.link-card*`、`@media`）を**ほぼ 1:1**で書き写す。`${(props) => props.theme.X}` は対応する `var(--X)` に置換。
3. `__root.tsx` は styled-components の `ThemeProvider` と `GlobalStyles` を外し、代わりに `import "@/styles/tokens.css"` と `import "@/styles/global.css"` を **トップレベル**で行う。Phase 2 で入れた inline theme bootstrap script はそのまま残し、Phase 3 で初めて「`html[data-theme="dark"]` が CSS variable 経由で実画面に反映される」状態になる。
4. `lib/ThemeContext.tsx` は state + StyledThemeProvider 構造から、**`document.documentElement.dataset.theme` を直接書き換え + `localStorage` 永続化**の最薄版に書き直す。`useTheme()` API（`navi.tsx` だけが使う）は維持。`StyledThemeProvider` import を消すことで `styled-components` の最後のアプリ側参照が消える。
5. コンポーネント置換は spec section 9 の順序: `ui/` → `icons/` → `layout/` → `features/article/` → `features/profile/`。各ファイルは「`*.tsx` から `styled.X` 定義を消し、隣に `*.module.css` を作って `import styles from "./X.module.css"` で `className={styles.foo}` にする」という機械的変換に終始させる。視覚的差異が出る変更（マージンの round、色合いの微調整など）は本フェーズでは**一切しない**。1 file = 1 commit を基本単位とし、目視回帰の責任範囲を明確に保つ。
6. `next/image` を使う 2 コンポーネント（`thumbnail.tsx`、`slide-image.tsx`）はネイティブ `<img>` に置換する。Vite + TanStack Start には next/image 相当の最適化レイヤーがないため、現行 prerender でも `next/image` は static export モードで `<img>` 同等の出力をしている（`unoptimized: true`）。挙動互換のため `width` / `height` / `loading="lazy"` / `style` 属性をそのまま渡す。
7. styled-components dep を package.json から外す（spec section 9 Phase 3 の最終項目）。同時に `lib/useDarkMode.ts`（既に未使用）と `styles/global-style.ts` / `styles/theme.ts` を削除する。`lib/storage.ts` は spec section 7 で「localforage で永続化」が言及されているが、Phase 0 で `lib/ThemeContext.tsx` 自身が `localStorage` 直叩きに変わっており、Phase 2 の inline bootstrap script も `localStorage.getItem('theme')` を読む。**永続化を localStorage に統一**する方針に固定し、`lib/storage.ts` も削除する（localforage は他に使い道なし。Phase 4 の dep 削除リストに `localforage` を追加するための準備）。

**Tech Stack:** Vite 8（CSS Modules ネイティブサポート）、CSS custom properties、@tanstack/react-router v1（変更なし、既に Phase 1/2 で導入済み）

---

## File Structure

### Create
- `styles/tokens.css` — `:root, [data-theme="light"]` と `[data-theme="dark"]` の CSS variables 定義。`--color-*` / `--font-size-*` / `--font-weight-*` / `--content-width` / `--line-height` を網羅
- `styles/global.css` — `modern-normalize` の後段で当てる base layer + `body` / `a` / `ul, ol, li` / `.content` 配下のグローバル要素 / `.link-card*` を含む。記事本文の `dangerouslySetInnerHTML` 由来 HTML（h1-h6、p、blockquote、img、pre、code、リンクカード等）はここでスタイリングされる
- 各コンポーネント隣接の `*.module.css` 計 23 ファイル（後述の Modify 一覧と 1:1 対応）

### Modify
- `app/routes/__root.tsx` — `ThemeProvider` と `GlobalStyles` の JSX を消し、`import "@/styles/tokens.css"` と `import "@/styles/global.css"` をファイル上部に追加
- `lib/ThemeContext.tsx` — styled-components の `ThemeProvider` 参照を削除し、`document.documentElement.dataset.theme` を直接書き換える hook ベースのみに整理。API（`useTheme().theme` / `toggleTheme`）は据え置き
- `package.json` — `dependencies` から `styled-components` を、`devDependencies` から `@types/styled-components` を削除
- `components/ui/badge.tsx` — `styled.span` を CSS Module に置換、`$primary` boolean を `data-primary` 属性で表現
- `components/ui/container.tsx` — `styled.div` → `*.module.css`
- `components/ui/display.tsx` — `styled.h2` を CSS Module に。`$size` / `$uppercase` は `style={{}}`(`--size`) と `data-uppercase` で表現
- `components/ui/flex.tsx` — `styled.div` を CSS Module に。`$center` は `data-center` 属性
- `components/ui/heading.tsx` — `styled.h1` → `*.module.css`
- `components/ui/hr.tsx` — `styled.hr` → `*.module.css`
- `components/ui/section.tsx` — `styled.section` を CSS Module に。`primary` / `dark` / `center` は `data-variant` で表現（"primary" | "dark" | undefined）と `data-center`
- `components/ui/slide-image.tsx` — `styled.div` ＋ `keyframes` を CSS Module に。`Image from "next/image"` を `<img>` に置換、`@keyframes` は CSS ファイル内に直書き、`$animation` は `data-animation`
- `components/ui/tile-grid.tsx` — `styled.div` → `*.module.css`
- `components/ui/time.tsx` — `styled.time` → `*.module.css`
- `components/icons/icon.tsx` — `styled.i` を CSS Module に。`size` 動的値は CSS variable (`--icon-size`) で渡す
- `components/icons/icon-box.tsx` — `styled.div` ＋ `keyframes move` を CSS Module に
- `components/icons/icon-share.tsx` — `styled.div` を CSS Module に。`react-share` は維持（spec section 12 の「Phase 3 着手時に再確認」に対する結論: `react-share` 自身は styled-components を使っていないため維持で良い。確認手順は Task 1 Step 4）
- `components/layout/footer.tsx` — `styled.div` → `*.module.css`、`Link from "next/link"` は既に Phase 2 で `@/lib/router-link` 経由
- `components/layout/navi.tsx` — `styled.header` を CSS Module に。`useTheme` 経由のテーマトグルはそのまま
- `components/layout/navi-logo.tsx` — `styled.h1` を CSS Module に
- `components/layout/navi-menu.tsx` — `styled.div` ＋ `styled.p` を CSS Module に
- `components/features/article/article-info.tsx` — `styled.div` → `*.module.css`、内側の inline `style` も module class に整理
- `components/features/article/article-tile.tsx` — `styled.article` ＋ `styled.img` ＋ `styled.div` ＋ `styled.h2` ＋ `styled.p` を CSS Module に
- `components/features/profile/profile-link.tsx` — `styled.div` を CSS Module に（中身は ``）
- `components/features/profile/profile-user.tsx` — `styled.div` を CSS Module に
- `components/features/profile/profile-work.tsx` — `styled.a` を CSS Module に
- `components/features/profile/thumbnail.tsx` — `styled.div` を CSS Module に。`Image from "next/image"` を `<img>` に置換、`$circle` は `data-circle`、`$size` は `style={{ width, height }}`（CSS variable でも可だが number → px なので inline style が素直）
- `components/CLAUDE.md` — Styling 節を「styled-components」から「CSS Modules + CSS variables」に書き換え
- `lib/CLAUDE.md` — `ThemeContext.tsx` セクションの説明を「StyledThemeProvider 経由」から「`html[data-theme]` 直接書き換え」に更新、`useDarkMode.ts` / `storage.ts` セクションを削除
- `styles/CLAUDE.md` — `theme.ts` / `global-style.ts` セクションを削除し、`tokens.css` / `global.css` セクションに置換
- `app/CLAUDE.md` — Phase 2 plan Task 11 で削除予定だったがまだ残っている。Next.js App Router 前提の記述を削除し、TanStack Router の `app/routes/` 配下の説明に書き直す（または Phase 4 で書き直すこととして本フェーズでは削除のみ）
- `.github/workflows/test.yml` — smoke check に「`<style data-styled>` のような styled-components ランタイム注入が出ない」確認を追加
- `docs/superpowers/specs/2026-05-01-modernize-stack-design.md` — Phase 3 を完了マーキング、section 12 の `react-share` 残課題を解消ステータスに更新

### Delete
- `styles/global-style.ts` — `styles/global.css` に置換
- `styles/theme.ts` — `styles/tokens.css` に置換
- `lib/useDarkMode.ts` — 未使用（`lib/ThemeContext.tsx` が同等機能を持つ）
- `lib/storage.ts` — `localforage` ベースのラッパーは未使用化。Phase 4 で `localforage` dep を消す前提で本フェーズで削除

### Untouched
- `velite.config.ts`、`lib/content/**`、`scripts/verify-velite.ts`、`scripts/inspect-paths.ts`、`lib/posts.ts`、`lib/posts-legacy.ts`、`lib/router-link.tsx`、`lib/site.ts` — Phase 0/2 で固めた状態を維持
- `app/routes/index.tsx`、`app/routes/profile.tsx`、`app/routes/$.tsx`、`app/router.tsx` — Phase 2 のロジックは触らない
- `vite.config.mts` — CSS Modules は Vite ネイティブで設定不要
- `lib/image-utils.ts`、`lib/rehype-link-card.ts`、`lib/link-card.ts` — Phase 4 / 既存ロジックとして維持
- `next.config.mjs`、`next-env.d.ts` — Phase 4 で削除予定
- `components/layout/layout.tsx`、`components/features/article/article.tsx`、`components/features/article/article-index.tsx`、`components/features/profile/profile-others.tsx` — そもそも styled-components を使っていない（grep で 0 件）。Phase 3 では touch しない

---

## Conventions

- ブランチは Phase 2 と同じ `modernize-stack-phase1-tanstack-skeleton` を**そのまま継続**する。spec section 9 改訂注に従い、Phase 3 完了時点で再度 merge 可否を判定する
- 全コミットは Phase 1 worktree（`/Users/jaxx/repos/blog/.worktrees/modernize-stack-phase1-tanstack-skeleton`）で作業する。本 plan ファイルを Phase 1 ブランチに取り込みたい場合は `git cherry-pick` か Task 1 Step 2 のマージ
- 各コンポーネント変換は **1 file = 1 commit**。理由は (1) 視覚回帰が出たときの blame ピンポイント化、(2) Cloudflare Pages の自動 preview を都度確認しやすくする、(3) PR レビュー時に "swap styled-components → CSS Module: <file>" の粒度で読める
- 命名規約: CSS Module 内のクラス名は **camelCase**（Vite + TS の自動補完が効く形）。例: `styles.tileContainer`、`styles.contentContainer`
- Boolean prop の表現は **`data-*` 属性 + CSS attribute selector**。理由: (1) `className` の動的連結（`clsx` 等）を導入せずに済む、(2) DOM inspector でテーマ/状態が一目で分かる、(3) 既存の styled-components の `$primary` 等の transient prop と意味的に等価。例: `<span className={styles.badge} data-primary={primary ? "" : undefined}>` ＋ `.badge[data-primary] { background: var(--color-primary) }`
- 数値で動的に変わる値（`size`、`$size` 等）は **CSS variable 経由で `style={{}}` から渡す**。例: `<div className={styles.icon} style={{ "--icon-size": `${size ?? 3}rem` } as React.CSSProperties}>` ＋ `.icon { font-size: var(--icon-size) }`
- 各 task の最後に `pnpm test`（tsc）と `pnpm lint:ci`（biome）を必ず通す
- 視覚回帰は **`pnpm dev` でブラウザ確認**を必須化する。CSS Modules はビルドエラーが出ない種類のミス（クラス名タイポなど）を出すリスクがあり、tsc では検出できない
- 「FOUC が消えた」の判定基準: prerender 後の HTML を `view-source:` で開くと、`<head>` 内に `<link rel="stylesheet">` の hashed CSS asset が直接出力されており、`<body>` には `<style data-styled>` のような styled-components ランタイム DOM が現れない
- styled-components 依存削除（Task 12）は **全コンポーネント変換完了後**に必ず行う。途中で消すと `pnpm dev` が起動しない

---

## Revisions（実装中に確定した方針差分）

このセクションは**実装後に追記する**ためのプレースホルダ。Phase 1 / Phase 2 plan と同じ運用で、当初案と現実が乖離した点を記録する。空欄でコミットを始め、Task 単位で気付いたら追記する。

| 当初 plan の前提 | 実装後の現実 | 確定理由 |
|------|------|------|
| (空欄。Task 単位で追記) |  |  |

---

## Task 1: Phase 1 ブランチでの作業準備とベースライン確認

**Files:**
- 確認のみ

- [ ] **Step 1: Phase 1 worktree に入り、最新を取り込む**

```bash
cd /Users/jaxx/repos/blog/.worktrees/modernize-stack-phase1-tanstack-skeleton
git status
git fetch -p origin
```

Expected: ブランチが `modernize-stack-phase1-tanstack-skeleton`、未 commit 変更が無い、`origin/main` の最新が取れる

- [ ] **Step 2: main の進捗を Phase 1 ブランチに取り込む（必要な場合のみ）**

```bash
git merge --no-ff origin/main -m "merge: bring main into phase 1 branch before phase 3"
```

main 側に Phase 2 完了後の修正が入っている場合は fast-forward もしくは clean merge。conflict が出た場合はファイルごとに調査し、Phase 1 ブランチで Phase 2 まで実装した版を優先（main は Next.js のままなので、移行ブランチ側が真正）。conflict が出ないか、`origin/main` がブランチの祖先なら本 step はスキップ。

- [ ] **Step 3: Velite ビルドと Vite ビルドが両方通ることを確認**

```bash
pnpm install --frozen-lockfile
pnpm velite:build
pnpm test
pnpm build
ls dist/client/index.html dist/client/profile/index.html dist/client/php-replace-lf/index.html
```

Expected: 全コマンド exit 0、3 つの index.html が存在

- [ ] **Step 4: react-share の styled-components 依存を最終確認**

spec section 12 の残課題「`react-share` の利用箇所と styled-components 依存の有無は Phase 3 着手時に再確認」を潰す。

```bash
grep -rln "styled-components" node_modules/react-share/ 2>/dev/null | head
pnpm list react-share
```

Expected: 1 件もヒットしない、または peer 依存ではなく単純な devDependency にも入っていない。`react-share` は SVG とコールバックだけのコンポーネント群で styled-components 依存を持たないことを確認する。

確認結果は本 plan の Revisions 表に書き留める。万一 styled-components 依存が見つかった場合は、Task 12（styled-components 撤去）の前に `react-share` の入れ替え対応を別タスクとして挟む（typically `react-share` 6.x で十分軽量なため起きない想定）。

- [ ] **Step 5: 現行 styled-components の出力 DOM を記録**

Phase 3 完了後の比較対象として、Phase 2 完了時点の prerender HTML と dev サーバーでの runtime DOM を控えておく:

```bash
# prerender 後の <head> 内 style タグ件数（styled-components の inject 場所候補）
grep -c "<style" dist/client/index.html
grep -c "<style" dist/client/php-replace-lf/index.html
```

Expected: ある程度 0 / 少数（prerender 時には styled-components が SSR 収集していないため、ほぼ 0 件）。Phase 3 完了後にここが「`<link rel="stylesheet">` でハッシュ付き css が増える」変化を確認する。値を Revisions に控える。

- [ ] **Step 6: 作業開始のチェックポイントコミット（merge をした場合のみ）**

merge コミットだけが付く想定なら追加コミットは不要。merge をスキップしたなら本 step はスキップ。

---

## Task 2: `styles/tokens.css` を作成（CSS variables）

`styles/theme.ts` の値を CSS custom property に移し替える。命名は spec section 7 の例に近づけつつ、現行 theme オブジェクトの全フィールドを網羅する。`[data-theme="dark"]` のオーバーライド値は `styles/theme.ts:darkTheme` と完全一致させる。

**Files:**
- Create: `styles/tokens.css`

- [ ] **Step 1: `styles/tokens.css` を作成**

```css
:root,
[data-theme="light"] {
  --color-main: #e91e63;
  --color-sub: #868e96;
  --color-accent: #495057;
  --color-text: #495057;
  --color-background: #ffffff;
  --color-border: #eeeeee;
  --color-shadow: rgba(0, 0, 0, 0.1);

  --content-width: 900px;

  --font-size-small: 0.875rem;
  --font-size: 1rem;
  --font-size-large: 1.125rem;
  --font-size-jumbo: 2rem;

  --font-weight: 400;
  --font-weight-bold: 700;

  --line-height: 1.8;
}

[data-theme="dark"] {
  --color-main: #e91e63;
  --color-sub: #868e96;
  --color-accent: #ffffff;
  --color-text: #ffffff;
  --color-background: #282c35;
  --color-border: #444444;
  --color-shadow: rgba(255, 255, 255, 0.1);
}
```

設計メモ:
- `darkTheme` は `colorAccent` / `colorText` / `colorBackground` / `colorBorder` / `colorShadow` の 5 つだけを上書きしている（`baseTheme` から差分のみ）。`tokens.css` でも同じ差分のみ書く（cascading の自然な活用）
- `--font-size` は単位込み（`1rem`）で書き、`global-style.ts` のように `${X}rem` テンプレを書かなくて済む形にする。これにより各コンポーネント側は `var(--font-size)` だけで済む
- `--content-width` は `900` (number) ではなく `900px` (length) で持たせる
- `--font-size-large-small` のような誤参照（現行 `slide-image.tsx` が `props.theme.fontSizeLargeSmall` を読んでいて `undefined` になっているバグ）は、Phase 3 では**修正せず温存**する。視覚的同等性が保てるかが本フェーズの Gate なので、既存の `font-size: undefinedrem` 相当（実際にはデフォルトの font-size 継承）を再現するだけ。Task 5 の slide-image 移植時に CSS では `font-size` プロパティ自体を**書かない**（コメントで理由を明示）

- [ ] **Step 2: 構文確認**

CSS は本 step では import 先がないため import エラーにはならない。tsc も通る:

```bash
pnpm test
```

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add styles/tokens.css
git commit -m "feat(styles): add CSS variables tokens for light/dark themes"
```

---

## Task 3: `styles/global.css` を作成（base + 記事本文スタイル）

`styles/global-style.ts` の `createGlobalStyle` 内容を、`var(--*)` 参照に置換した素の CSS で書き直す。`body` / `a` / `ul,ol,li` / `.content` 配下（`h1-h6`、`p`、`blockquote`、`img`、`pre`、`code:not(pre code)`、`.link-card*`、`@media`）を**順序を変えずに**移植する。

**Files:**
- Create: `styles/global.css`

- [ ] **Step 1: `styles/global.css` を作成**

```css
body {
  -webkit-font-smoothing: antialiased;
  background-color: var(--color-background);
  color: var(--color-text);
  font-weight: var(--font-weight);
  font-size: var(--font-size);
  transition: color 0.2s ease-out, background 0.2s ease-out;
  line-height: var(--line-height);
}

a {
  color: var(--color-main);
  text-decoration: none;
}

ul,
ol {
  padding-inline-start: 1rem;
}

li {
  list-style-position: inside;
  margin: 0.25rem 0;
}

.content {
  margin: 0;
  padding: 0;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6 {
  font-size: var(--font-size);
  font-weight: var(--font-weight-bold);
  margin: 2rem 0 1rem;
  line-height: 1.2;
  letter-spacing: -0.025rem;
}

.content p {
  font-weight: var(--font-weight);
  margin: 1rem 0;
}

.content blockquote {
  background-color: var(--color-background);
  border-left: 5px solid var(--color-border);
  color: var(--color-sub);
  padding: 0.25em 1.5em;
  margin: 1.5rem 0;
}

.content blockquote p {
  margin: 1rem 0;
}

.content blockquote a {
  display: block;
  word-break: break-word;
}

.content img {
  width: 100%;
  margin: 1.5rem 0;
}

/* Code block styles - レイアウトのみ（色は rehype-pretty-code のテーマが適用） */
.content pre {
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
  overflow-x: auto;
  font-size: var(--font-size-small);
  line-height: 1.6;
  font-family: "Consolas", "Monaco", "Andale Mono", "Ubuntu Mono", monospace;
}

/* Inline code styles */
.content code:not(pre code) {
  background-color: var(--color-border);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: var(--font-size-small);
  font-family: "Consolas", "Monaco", "Andale Mono", "Ubuntu Mono", monospace;
}

/* Link card styles */
.content .link-card {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.content .link-card:hover {
  border-color: var(--color-main);
  box-shadow: 0 2px 8px var(--color-shadow);
}

.content .link-card-image {
  flex-shrink: 0;
  width: 120px;
  min-height: 100px;
  background-color: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.content .link-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  margin: 0;
}

.content .link-card-no-image span {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-sub);
}

.content .link-card-content {
  flex: 1;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.content .link-card-title {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.content .link-card-description {
  font-size: var(--font-size-small);
  color: var(--color-sub);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.content .link-card-site {
  font-size: var(--font-size-small);
  color: var(--color-sub);
}

@media (max-width: 480px) {
  .content .link-card-image {
    width: 80px;
    min-height: 80px;
  }

  .content .link-card-content {
    padding: 0.5rem 0.75rem;
  }

  .content .link-card-title {
    font-size: var(--font-size-small);
  }

  .content .link-card-description {
    -webkit-line-clamp: 1;
  }
}
```

設計メモ:
- styled-components の入れ子セレクタ（`& blockquote { p { ... } }`）は素の CSS では `.content blockquote p { ... }` のようにフラットに展開する。Vite のネイティブ CSS は CSS Nesting Module Level 1 をサポートするが、互換性重視で展開形を採用
- `.link-card` は記事本文 HTML（`dangerouslySetInnerHTML` 経由）が `<a class="link-card">` を生成する。`*.module.css` には**入れずに**グローバル `.content .link-card` で当てる必要があり、本 file が唯一の置き場所
- `transition` プロパティ複数指定は CSS のショートハンドが効くが、styled-components 版と完全に同じ書式を維持して diff を最小化する

- [ ] **Step 2: 構文確認**

```bash
pnpm test
```

Expected: exit 0（CSS は tsc 対象外なので実質通常通り）

- [ ] **Step 3: Commit**

```bash
git add styles/global.css
git commit -m "feat(styles): add global stylesheet with article content + link-card styles"
```

---

## Task 4: `__root.tsx` で tokens.css と global.css を import、ThemeProvider/GlobalStyles を撤去

**Files:**
- Modify: `app/routes/__root.tsx`

- [ ] **Step 1: 現状の `__root.tsx` を確認**

```bash
grep -n "styled\|GlobalStyles\|ThemeProvider" app/routes/__root.tsx
```

Expected:
- `import { ThemeProvider } from "@/lib/ThemeContext"`
- `import GlobalStyles from "@/styles/global-style"`
- `<ThemeProvider><GlobalStyles />{children}</ThemeProvider>`

- [ ] **Step 2: import 行を差し替え**

`app/routes/__root.tsx` の `import "modern-normalize/modern-normalize.css"` の **直後**に以下 2 行を追加:

```tsx
import "@/styles/tokens.css"
import "@/styles/global.css"
```

そして以下 2 行を**削除**:

```tsx
import { ThemeProvider } from "@/lib/ThemeContext"
import GlobalStyles from "@/styles/global-style"
```

- [ ] **Step 3: JSX を差し替え**

`RootDocument` の `<body>` 内を以下に書き換え:

```tsx
      <body>
        {children}
        <Scripts />
      </body>
```

差分:
- `<ThemeProvider>` ラッパー削除
- `<GlobalStyles />` の自己閉じタグ削除
- `{children}` を直接 `<body>` 直下に置く

`<head>` 内の `<HeadContent />` と inline theme bootstrap script は**触らない**。Phase 2 で入れた script が Phase 3 で初めて意味を持つ（`document.documentElement.dataset.theme = t` を CSS variables が拾う）。

- [ ] **Step 4: 型チェック**

```bash
pnpm test
```

Expected: exit 0

`Cannot find module '@/styles/tokens.css'` のエラーが出る場合: tsconfig の `paths` や `vite/client` 型参照を確認。`/// <reference types="vite/client" />` がファイル先頭にあれば CSS の side-effect import は型解決可能。

- [ ] **Step 5: 単独 build smoke**

```bash
rm -rf dist .velite
pnpm build
ls dist/client/assets/*.css
```

Expected: `dist/client/assets/` 配下に hashed CSS が**少なくとも 1 ファイル**出力されている（Vite が tokens.css と global.css をバンドル）

```bash
grep -F '<link rel="stylesheet"' dist/client/index.html
```

Expected: hashed CSS asset への `<link rel="stylesheet">` がヒット

- [ ] **Step 6: dev サーバーで「FOUC が無くなったように見えない」ことの確認**

Phase 3 の本タスク段階では、各コンポーネントがまだ styled-components で描画されている。CSS variables は導入されたが、コンポーネントは旧 theme を読みに行くため**まだ視覚的には何も変わっていない**ことを確認する:

```bash
pnpm dev
```

ブラウザで http://localhost:3000/ を開き、見た目が Phase 2 と同じ（ピンクのナビ、白背景、styled-components で描画される文字）であることを確認。dev console に warning が出ても、`useTheme must be used within ThemeProvider` のような fatal error が出ていなければ OK。

`useTheme must be used within ThemeProvider` が出る場合: `lib/ThemeContext.tsx` の `useTheme()` が `<ThemeProvider>` を必要としている。本タスクでは ThemeProvider を JSX から外したので、Task 5 で `useTheme` の require-provider を解除するか、本 step で navi.tsx を一時的にダミーテーマで動かす対応が必要。**Task 5 を本タスクと同じ commit に含める方が安全** — Task 5 の Step 1〜2 を本タスクと同時に実行して 1 commit にまとめる選択肢を取れる。dev で起動する以前に decide しておく。

確認後、dev サーバーを止める。

- [ ] **Step 7: Commit**

```bash
git add app/routes/__root.tsx
git commit -m "refactor(routes): mount global css instead of styled-components provider"
```

Step 6 で Task 5 と合体させた場合は commit メッセージを `refactor: switch root to plain css and refactor theme context` に変更し、`lib/ThemeContext.tsx` も同 commit に含める。

---

## Task 5: `lib/ThemeContext.tsx` を data-theme 直接書き換え版にリファクタ

styled-components の `ThemeProvider` 依存を消し、`useTheme()` の API（`{ theme, toggleTheme }`）はそのまま残す最小書き直し。`<html data-theme>` 属性の更新と `localStorage` 永続化のみが責務になる。

**Files:**
- Modify: `lib/ThemeContext.tsx`

- [ ] **Step 1: `lib/ThemeContext.tsx` を以下に置換**

```tsx
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

type ThemeMode = "light" | "dark"

interface ThemeContextType {
  theme: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("light")

  useEffect(() => {
    const root = document.documentElement
    const initial =
      (root.dataset.theme as ThemeMode | undefined) ??
      (localStorage.getItem("theme") as ThemeMode | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    setTheme(initial)
    root.dataset.theme = initial
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light"
      document.documentElement.dataset.theme = next
      localStorage.setItem("theme", next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

設計メモ:
- styled-components の `ThemeProvider` import を削除
- 初期化順序: (1) inline bootstrap script で `dataset.theme` が既にセット済み（最優先で hydrate と SSR の差を消す）、(2) なければ `localStorage`、(3) なければ `prefers-color-scheme`。これは Phase 2 で `__root.tsx` に入れた script と完全に同じ判定ロジックで、二重実行を許容する（冪等）
- `useState` の初期値は `"light"` 固定で、`useEffect` で実機テーマに揃える。SSR 時は常に `"light"` で render され、hydrate 後の useEffect で `data-theme` 属性が更新される。CSS variables は属性で切り替わるため React の再 render は不要 — 結果として「navi のトグル絵文字 (`🌅` / `🌃`) だけが state 同期で再描画される」最小負荷
- `useCallback` で `toggleTheme` の reference を安定させる（navi.tsx の onClick handler が毎 render で変わらない）

- [ ] **Step 2: `__root.tsx` から `ThemeProvider` を再度マウント**

Task 4 で `__root.tsx` の `<body>` 直下から `<ThemeProvider>` を消したが、本タスクの新 `ThemeContext.tsx` は **JSX context provider が引き続き必要**（navi.tsx の `useTheme` が context を読む）。`__root.tsx` を以下のように再修正:

```tsx
import { ThemeProvider } from "@/lib/ThemeContext"
```

`<body>` 内を:

```tsx
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
```

設計メモ:
- `ThemeProvider` は今や styled-components ではなく純 React Context Provider。子要素に対して何の DOM も生成しない (`children` をそのまま流すだけ)
- `<GlobalStyles />` は Task 4 で外したまま（CSS は tokens.css / global.css の import で当たる）

- [ ] **Step 3: 型チェックと dev 起動**

```bash
pnpm test
pnpm dev
```

Expected: tsc exit 0、dev でブラウザ http://localhost:3000/ が開ける。`useTheme must be used within ThemeProvider` エラーが出ない。

ナビ右端のテーマトグル (`🌅` / `🌃`) をクリックすると、`<html>` の `data-theme` 属性が `light` ↔ `dark` でトグルされることを DevTools で確認。**ただしこの時点では他のコンポーネントが styled-components のままなので、背景色などはまだ変わらない**（navi の絵文字だけ切り替わる）。

確認後 dev サーバーを止める。

- [ ] **Step 4: Commit**

```bash
git add lib/ThemeContext.tsx app/routes/__root.tsx
git commit -m "refactor(theme): replace styled provider with html[data-theme] toggling"
```

---

## Task 6: `components/ui/container.tsx` を CSS Module に置換（最小サンプル）

`ui/` ディレクトリの中で**最も単純な**コンポーネントから着手し、CSS Modules の取り回しを確立する。ここで決めた書式（camelCase、import 位置、`type Props` 配置）を以降のタスクで踏襲する。

**Files:**
- Create: `components/ui/container.module.css`
- Modify: `components/ui/container.tsx`

- [ ] **Step 1: `components/ui/container.module.css` を作成**

```css
.container {
  margin: 0 auto;
  padding: 0 1rem;
  max-width: var(--content-width);
}
```

- [ ] **Step 2: `components/ui/container.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./container.module.css"

const Container: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className={styles.container}>{children}</div>
)

export default Container
```

設計メモ:
- 元の `Container` は `styled.div` で `children` プロップを暗黙に受けていた。React FC として明示する形に揃える
- `"use client"` ディレクティブは Phase 2 Task 11 で除去済み — 残っていれば一緒に削除する

- [ ] **Step 3: 型チェック**

```bash
pnpm test
```

Expected: exit 0。`Cannot find module './container.module.css'` が出る場合は `vite/client` 型参照（`__root.tsx` 先頭の `/// <reference types="vite/client" />` または tsconfig 内の `types: ["vite/client"]`）が effective か確認。

- [ ] **Step 4: dev で目視確認**

```bash
pnpm dev
```

ブラウザで http://localhost:3000/ と http://localhost:3000/profile/ を開く。`Container` を使うコンポーネント（記事一覧の親、ナビ、フッタ、Article）の横幅が変わっていないことを確認。

確認後 dev サーバーを止める。

- [ ] **Step 5: Commit**

```bash
git add components/ui/container.tsx components/ui/container.module.css
git commit -m "refactor(ui/container): swap styled-components to css module"
```

---

## Task 7: `components/ui/heading.tsx` を CSS Module に置換

**Files:**
- Create: `components/ui/heading.module.css`
- Modify: `components/ui/heading.tsx`

- [ ] **Step 1: `components/ui/heading.module.css` を作成**

```css
.heading {
  color: var(--color-main);
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025rem;
  line-height: 1.2;
  margin: 0;
}

.heading:hover {
  transition: color 0.2s ease-out;
  color: var(--color-sub);
}
```

- [ ] **Step 2: `components/ui/heading.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./heading.module.css"

const Heading: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className={styles.heading}>{children}</h1>
)

export default Heading
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

ブラウザで記事詳細（例: http://localhost:3000/php-replace-lf/）を開き、記事タイトルがピンク色で表示され hover で colorSub に遷移することを確認。

- [ ] **Step 4: Commit**

```bash
git add components/ui/heading.tsx components/ui/heading.module.css
git commit -m "refactor(ui/heading): swap styled-components to css module"
```

---

## Task 8: `components/ui/badge.tsx` を CSS Module に置換（boolean prop 表現の確立）

`primary` boolean prop を `data-primary` 属性で表現するパターンをここで確立する。以降のタスクの reference 実装。

**Files:**
- Create: `components/ui/badge.module.css`
- Modify: `components/ui/badge.tsx`

- [ ] **Step 1: `components/ui/badge.module.css` を作成**

```css
.badge {
  background-color: var(--color-sub);
  border-radius: 4px;
  box-sizing: border-box;
  color: rgb(255, 255, 255);
  display: inline;
  font-size: var(--font-size-small);
  line-height: var(--font-size-small);
  font-weight: var(--font-weight);
  outline-style: none;
  margin: auto 0;
  text-decoration-line: none;
  padding: calc(var(--font-size-small) / 2) var(--font-size-small);
  text-align: center;
  white-space: nowrap;
}

.badge[data-primary] {
  background-color: var(--color-main);
}
```

設計メモ:
- 元 `Badge` は `padding: ${theme.fontSizeSmall / 2}rem ${theme.fontSizeSmall}rem` で number 演算をしていた。CSS variable は string なので `calc(var(--font-size-small) / 2) var(--font-size-small)` で再現。`--font-size-small` が `0.875rem` で定義されていれば `calc(0.875rem / 2)` = `0.4375rem` になり、現行と完全一致
- `data-primary` 属性は `<span data-primary={primary ? "" : undefined}>` で渡す。空文字 `""` は presence-only 属性として CSS で `[data-primary]` がマッチする一方、`undefined` は React が属性自体を出力しないため `[data-primary]` がマッチしない

- [ ] **Step 2: `components/ui/badge.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./badge.module.css"

interface Props {
  items: string[] | null
  primary?: boolean
}

const Badges: React.FC<Props> = ({ items, primary }) => {
  if (!items) return null
  return (
    <>
      {items.map((item, i) => (
        <span
          key={i}
          className={styles.badge}
          data-primary={primary ? "" : undefined}
        >
          {item}
        </span>
      ))}
    </>
  )
}

export default Badges
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

記事詳細ページで category badge（ピンク背景）と tag badge（グレー背景）の色が現行と同じであることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/ui/badge.tsx components/ui/badge.module.css
git commit -m "refactor(ui/badge): swap styled-components to css module with data-primary"
```

---

## Task 9: `components/ui/display.tsx` を CSS Module に置換（数値 prop の CSS variable 化）

`$size` (number) を CSS variable で渡し、`$uppercase` (boolean) を `data-uppercase` 属性で表現するパターンを確立する。

**Files:**
- Create: `components/ui/display.module.css`
- Modify: `components/ui/display.tsx`

- [ ] **Step 1: `components/ui/display.module.css` を作成**

```css
.display {
  font-size: var(--display-size, var(--font-size-jumbo));
  font-weight: var(--font-weight-bold);
  line-height: var(--font-size-large);
  letter-spacing: -0.05rem;
  color: var(--color-main);
  padding: 0;
  text-transform: none;
}

.display[data-uppercase] {
  text-transform: uppercase;
}
```

設計メモ:
- 元 `Display` は `font-size: ${$size || theme.fontSizeJumbo}rem`。`var(--display-size, var(--font-size-jumbo))` の fallback で同等。`$size` が undefined なら `--display-size` 自体を `style` に渡さないので fallback の `--font-size-jumbo` が効く
- `line-height` は元コードが `${theme.fontSizeLarge}rem` なので `var(--font-size-large)` で OK（既に rem 単位込み）

- [ ] **Step 2: `components/ui/display.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./display.module.css"

interface Props {
  $size?: number
  $uppercase?: boolean
  children?: React.ReactNode
}

const Display: React.FC<Props> = ({ $size, $uppercase, children }) => (
  <h2
    className={styles.display}
    data-uppercase={$uppercase ? "" : undefined}
    style={
      $size !== undefined
        ? ({ "--display-size": `${$size}rem` } as React.CSSProperties)
        : undefined
    }
  >
    {children}
  </h2>
)

export default Display
```

設計メモ:
- prop 名は元の `$size` / `$uppercase` を維持（呼び出し側 `<Display $uppercase>` の修正を不要にする）
- React の `style` に CSS custom property を渡すには `as React.CSSProperties` キャストが必要（`--display-size` は型定義に無いため）

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ の "Futoshi Iwashita"（`<Display>`）が大きいピンク文字で表示され、"Work" と "Links" / "Others" の見出しが UPPERCASE で表示されることを確認（`Work` は `<Display $uppercase>`）。

- [ ] **Step 4: Commit**

```bash
git add components/ui/display.tsx components/ui/display.module.css
git commit -m "refactor(ui/display): swap styled-components to css module with css-var size"
```

---

## Task 10: `components/ui/flex.tsx` / `hr.tsx` / `time.tsx` の CSS Module 化（並行可能な簡単 3 件）

3 ファイルとも単純なため一括で進めるが、commit は独立して 3 つ作る。失敗時の切り戻しを容易にするため。

**Files:**
- Create: `components/ui/flex.module.css`、`components/ui/hr.module.css`、`components/ui/time.module.css`
- Modify: `components/ui/flex.tsx`、`components/ui/hr.tsx`、`components/ui/time.tsx`

- [ ] **Step 1: `components/ui/flex.module.css` を作成**

```css
.flex {
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-flow: wrap;
  justify-content: left;
}

.flex[data-center] {
  justify-content: center;
}
```

- [ ] **Step 2: `components/ui/flex.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./flex.module.css"

interface Props {
  $center?: boolean
  children?: React.ReactNode
}

const Flex: React.FC<Props> = ({ $center, children }) => (
  <div className={styles.flex} data-center={$center ? "" : undefined}>
    {children}
  </div>
)

export default Flex
```

- [ ] **Step 3: `components/ui/hr.module.css` を作成**

```css
.hr {
  max-width: 5rem;
  margin: 2rem auto;
  border: 0;
  border-top: 3px solid var(--color-border);
}
```

- [ ] **Step 4: `components/ui/hr.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./hr.module.css"

const Hr: React.FC = () => <hr className={styles.hr} />

export default Hr
```

- [ ] **Step 5: `components/ui/time.module.css` を作成**

```css
.time {
  color: var(--color-sub);
  display: inline-block;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight);
  text-align: center;
  vertical-align: baseline;
}
```

- [ ] **Step 6: `components/ui/time.tsx` を以下に書き換え**

```tsx
import { format, parseISO } from "date-fns"
import type React from "react"
import styles from "./time.module.css"

interface Props {
  created_at: string
}

const Time: React.FC<Props> = ({ created_at }) => {
  const formattedDate = format(parseISO(created_at), "yyyy/MM/dd")
  return (
    <time className={styles.time} dateTime={created_at}>
      {formattedDate}
    </time>
  )
}

export default Time
```

- [ ] **Step 7: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ で Work セクションのアイテムが中央寄せ（`<Flex $center>`）、フッタの `<Hr>` が水平線で表示、記事詳細で日付がグレーで表示されることを確認。

- [ ] **Step 8: 3 つに分けて commit**

```bash
git add components/ui/flex.tsx components/ui/flex.module.css
git commit -m "refactor(ui/flex): swap styled-components to css module"

git add components/ui/hr.tsx components/ui/hr.module.css
git commit -m "refactor(ui/hr): swap styled-components to css module"

git add components/ui/time.tsx components/ui/time.module.css
git commit -m "refactor(ui/time): swap styled-components to css module"
```

---

## Task 11: `components/ui/section.tsx` を CSS Module に置換（多変数 variant の data-* 化）

`primary` / `dark` / `center` の 3 boolean prop で背景色と文字色が条件分岐する。`data-variant="primary" | "dark"` ＋ `data-center` で表現する。

**Files:**
- Create: `components/ui/section.module.css`
- Modify: `components/ui/section.tsx`

- [ ] **Step 1: `components/ui/section.module.css` を作成**

```css
.section {
  padding: 2rem 0 4rem;
  position: relative;
  margin: 0 auto;
  text-align: left;
  color: var(--color-accent);
  background: inherit;
}

.section[data-center] {
  text-align: center;
}

.section[data-variant="primary"] {
  color: white;
  background: var(--color-main);
}

.section[data-variant="dark"] {
  color: white;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.75), rgba(1, 1, 1, 0.25) 50%);
}

.section a {
  color: var(--color-accent);
}

.section[data-variant="primary"] a,
.section[data-variant="dark"] a {
  color: white;
}
```

設計メモ:
- 元コードでは `dark && primary` の同時指定で `dark` の background が優先、`color` も `primary` か `dark` のどちらかで white。CSS では後勝ち優先で `[data-variant="dark"]` の方が `[data-variant="primary"]` の後にあるが、prop 設計を `variant: "primary" | "dark"` の単一に絞るので**同時指定を許さない**ことで簡潔化する
- 実際の呼び出し箇所は `<Section>`（profile-* / 記事詳細）のみで、`primary` / `dark` を**両方**渡している箇所は無い（grep で確認可能）

- [ ] **Step 2: `components/ui/section.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./section.module.css"

interface Props {
  primary?: boolean
  dark?: boolean
  center?: boolean
  children?: React.ReactNode
}

const Section: React.FC<Props> = ({ primary, dark, center, children }) => {
  const variant = primary ? "primary" : dark ? "dark" : undefined
  return (
    <section
      className={styles.section}
      data-variant={variant}
      data-center={center ? "" : undefined}
    >
      {children}
    </section>
  )
}

export default Section
```

設計メモ:
- API は元の `<Section primary dark center>` を維持。同時指定された場合は `primary` を優先（元コードの `if (props.primary) return "white"` の評価順と同じ）

- [ ] **Step 3: 呼び出し箇所のレビュー**

```bash
grep -rn "<Section" components/ app/
```

`primary` / `dark` を**同時に**渡している箇所が無いことを確認。あれば本タスクの仕様変更（同時指定不許容）と衝突するので、Revisions に記録した上で個別対応する。

- [ ] **Step 4: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ で Section が均等な余白で 4 つ並んでいることを確認。

- [ ] **Step 5: Commit**

```bash
git add components/ui/section.tsx components/ui/section.module.css
git commit -m "refactor(ui/section): swap styled-components to css module with data-variant"
```

---

## Task 12: `components/ui/tile-grid.tsx` を CSS Module に置換

**Files:**
- Create: `components/ui/tile-grid.module.css`
- Modify: `components/ui/tile-grid.tsx`

- [ ] **Step 1: `components/ui/tile-grid.module.css` を作成**

```css
.grid {
  margin: 0 auto;
  padding: 0 1rem;
  max-width: var(--content-width);
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: auto;
}

@media (max-width: 767px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

- [ ] **Step 2: `components/ui/tile-grid.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./tile-grid.module.css"

const TileGrid: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className={styles.grid}>{children}</div>
)

export default TileGrid
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/ でタイルが 5 列（PC 幅）で並ぶこと、767px 以下で 3 列に折り返ることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/ui/tile-grid.tsx components/ui/tile-grid.module.css
git commit -m "refactor(ui/tile-grid): swap styled-components to css module"
```

---

## Task 13: `components/ui/slide-image.tsx` を CSS Module + `<img>` に置換（next/image 撤去 #1）

`@keyframes` 3 種類を CSS Module 内に直書き、`Image from "next/image"` を `<img>` に置換、`$animation` を `data-animation` で表現する。

**Files:**
- Create: `components/ui/slide-image.module.css`
- Modify: `components/ui/slide-image.tsx`

- [ ] **Step 1: `components/ui/slide-image.module.css` を作成**

```css
.wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.wrapper:hover {
  transform: scale(1.02);
}

.wrapper[data-animation="fadeIn"] {
  animation: fadeIn 0.6s ease-in-out;
}

.wrapper[data-animation="slideUp"] {
  animation: slideUp 0.6s ease-in-out;
}

.wrapper[data-animation="slideDown"] {
  animation: slideDown 0.6s ease-in-out;
}

.image {
  display: block;
  object-fit: cover;
  width: 200px;
  height: auto;
}

.capture {
  /* NOTE: 旧 styled-components 版は theme.fontSizeLargeSmall（未定義キー）を
   * 参照しており実質 font-size 未指定（親継承）だった。視覚同等性のため
   * font-size プロパティを意図的に書かない。Phase 4 以降で修正検討。 */
  font-weight: var(--font-weight-bold);
  font-family: "Courier New", Courier, monospace;
  text-align: center;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

設計メモ:
- `@keyframes` は CSS Module スコープに入る (Vite は default で local scope)。`animation: fadeIn ...` の `fadeIn` 識別子も同モジュール内に閉じ込められるため、他コンポーネントの `fadeIn` と衝突しない
- `font-size: undefinedrem` 相当の挙動（元バグ）を温存する旨をコメントで明示

- [ ] **Step 2: `components/ui/slide-image.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./slide-image.module.css"

interface Props {
  src: string
  alt: string
  title: string
  animation: "fadeIn" | "slideUp" | "slideDown"
}

const SlideImage: React.FC<Props> = ({ src, alt, title, animation }) => (
  <div className={styles.wrapper} data-animation={animation}>
    <img
      className={styles.image}
      src={src}
      alt={alt}
      width={200}
      height={200}
      loading="lazy"
    />
    <p className={styles.capture}>{title}</p>
  </div>
)

export default SlideImage
```

設計メモ:
- `Image from "next/image"` を `<img>` に置換。`width` / `height` は属性で渡し、`object-fit: cover` は CSS 側で当てる
- `loading="lazy"` を明示。spec section 2 の「`react-lazyload` → `loading="lazy"` で代替」と整合（react-lazyload は別箇所で使用、Phase 4 で除去）

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ の Work アイテム 6 つが 200x200 で fadeIn しながら表示されることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/ui/slide-image.tsx components/ui/slide-image.module.css
git commit -m "refactor(ui/slide-image): swap to css module with native img, drop next/image"
```

---

## Task 14: `components/icons/icon.tsx` を CSS Module に置換（数値 prop の CSS variable 化 #2）

`size?: number` を `--icon-size` CSS variable で渡す。`@fortawesome/react-fontawesome` の `<FontAwesomeIcon>` ラッパーは維持。

**Files:**
- Create: `components/icons/icon.module.css`
- Modify: `components/icons/icon.tsx`

- [ ] **Step 1: `components/icons/icon.module.css` を作成**

```css
.icon {
  display: block;
  font-size: var(--icon-size, 3rem);
  padding: 0.4rem;
  text-align: center;
}
```

- [ ] **Step 2: `components/icons/icon.tsx` を以下に書き換え**

```tsx
import { type IconName, library } from "@fortawesome/fontawesome-svg-core"
import {
  faApple, faAws, faFacebook, faGithub, faHtml5,
  faJs, faNode, faPhp, faReact, faTwitter, faVuejs,
} from "@fortawesome/free-brands-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type React from "react"
import styles from "./icon.module.css"

library.add(
  faAws, faApple, faPhp, faHtml5, faJs, faReact,
  faVuejs, faTwitter, faFacebook, faGithub, faNode,
)

interface Props {
  name: string
  size?: number
}

const Icon: React.FC<Props> = ({ name, size }) => (
  <i
    className={styles.icon}
    style={
      size !== undefined
        ? ({ "--icon-size": `${size}rem` } as React.CSSProperties)
        : undefined
    }
  >
    <FontAwesomeIcon icon={["fab", name as IconName]} width="20px" />
  </i>
)

export default Icon
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ で `Icon` を使う箇所（実装上は `IconBox` 経由のみ）でアイコンが現行サイズで表示されることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/icons/icon.tsx components/icons/icon.module.css
git commit -m "refactor(icons/icon): swap styled-components to css module with css-var size"
```

---

## Task 15: `components/icons/icon-box.tsx` を CSS Module に置換（keyframes #2）

`@keyframes move` を CSS Module に直書きし、`:hover` で animation を発動する。

**Files:**
- Create: `components/icons/icon-box.module.css`
- Modify: `components/icons/icon-box.tsx`

- [ ] **Step 1: `components/icons/icon-box.module.css` を作成**

```css
.box {
  width: 25%;
  padding: 2rem 0;
}

@media (max-width: 700px) {
  .box {
    width: 50%;
  }
}

.box:hover {
  animation: move 0.3s linear;
}

@keyframes move {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}
```

- [ ] **Step 2: `components/icons/icon-box.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./icon-box.module.css"
import Icon from "./icon"

interface Props {
  label: string
  icon: string
}

const Box: React.FC<Props> = ({ label, icon }) => (
  <div className={styles.box} title={label}>
    <Icon name={icon} />
  </div>
)

export default Box
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

`IconBox` の利用箇所が現状あるかを `grep -rn "icon-box\|IconBox" components/ app/` で確認。**現行コードでは利用箇所が無い**（spec / 旧 next.js page でも使われていない）可能性が高い。利用箇所が無くても CSS Module の hover アニメーションは Vite ビルド対象なので、ビルド成功を以て確認とする。

- [ ] **Step 4: Commit**

```bash
git add components/icons/icon-box.tsx components/icons/icon-box.module.css
git commit -m "refactor(icons/icon-box): swap styled-components to css module"
```

---

## Task 16: `components/icons/icon-share.tsx` を CSS Module に置換

**Files:**
- Create: `components/icons/icon-share.module.css`
- Modify: `components/icons/icon-share.tsx`

- [ ] **Step 1: `components/icons/icon-share.module.css` を作成**

```css
.share {
  display: flex;
  justify-content: center;
  margin: 0 auto;
  padding-bottom: 1.5rem;
}

.share div {
  display: inline-block;
  margin: 0.25rem;
}
```

- [ ] **Step 2: `components/icons/icon-share.tsx` を以下に書き換え**

```tsx
import type React from "react"
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share"
import styles from "./icon-share.module.css"

interface Props {
  url: string
  title: string
}

const Share: React.FC<Props> = ({ url, title }) => (
  <div className={styles.share}>
    <TwitterShareButton url={url} title={title}>
      <TwitterIcon size={32} round={true} />
    </TwitterShareButton>
    <FacebookShareButton url={url}>
      <FacebookIcon size={32} round={true} />
    </FacebookShareButton>
  </div>
)

export default Share
```

設計メモ:
- `react-share` の `FacebookShareButton` / `TwitterShareButton` は `<button>` ベースの DOM を返す。`.share div` セレクタは元コードのままで、`react-share` 内部の DOM 構造に依存する点も同じ（変わると visual がズレるが、Phase 3 の責任範囲外）

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

記事詳細ページで Twitter / Facebook シェアボタンが 32px 円形で 2 つ並んでいることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/icons/icon-share.tsx components/icons/icon-share.module.css
git commit -m "refactor(icons/icon-share): swap styled-components to css module"
```

---

## Task 17: `components/layout/footer.tsx` を CSS Module に置換

**Files:**
- Create: `components/layout/footer.module.css`
- Modify: `components/layout/footer.tsx`

- [ ] **Step 1: `components/layout/footer.module.css` を作成**

```css
.footer {
  padding: 2rem 0;
}
```

- [ ] **Step 2: `components/layout/footer.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Container from "@/components/ui/container"
import Hr from "@/components/ui/hr"
import Link from "@/lib/router-link"
import styles from "./footer.module.css"

const Footer: React.FC = () => (
  <Container>
    <div className={styles.footer}>
      <Hr />
      <p>コーラとバグが好き</p>
      <Link href="/profile">
        <p>
          <strong>jaxx2104</strong> on Profile
        </p>
      </Link>
    </div>
  </Container>
)

export default Footer
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

任意のページ最下部にフッタが表示されること、Hr が水平線として出ていること、`/profile` リンクが TanStack Router 経由で遷移することを確認。

- [ ] **Step 4: Commit**

```bash
git add components/layout/footer.tsx components/layout/footer.module.css
git commit -m "refactor(layout/footer): swap styled-components to css module"
```

---

## Task 18: `components/layout/navi-logo.tsx` を CSS Module に置換

**Files:**
- Create: `components/layout/navi-logo.module.css`
- Modify: `components/layout/navi-logo.tsx`

- [ ] **Step 1: `components/layout/navi-logo.module.css` を作成**

```css
.logo {
  color: white;
  font-family: "Permanent Marker";
  font-size: var(--font-size-large);
  font-weight: 900;
  letter-spacing: -0.05rem;
  text-transform: uppercase;
  margin-right: 1rem;
}

.logo:hover {
  color: var(--color-accent);
  transition: color 0.2s ease-out;
}
```

設計メモ:
- 元コードで `text-transform: "uppercase"` が文字列リテラル指定（CSS 構文的には正しくないが styled-components が許容）。CSS Module 化に際しては正しい `text-transform: uppercase` に修正

- [ ] **Step 2: `components/layout/navi-logo.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Link from "@/lib/router-link"
import styles from "./navi-logo.module.css"

interface Props {
  title: string
}

const Logo: React.FC<Props> = ({ title }) => (
  <Link href="/">
    <h1 className={styles.logo}>{title}</h1>
  </Link>
)

export default Logo
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

ナビ左端の `JAXX2104.INFO` が `Permanent Marker` フォントで白色表示されることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/layout/navi-logo.tsx components/layout/navi-logo.module.css
git commit -m "refactor(layout/navi-logo): swap styled-components to css module"
```

---

## Task 19: `components/layout/navi-menu.tsx` を CSS Module に置換

**Files:**
- Create: `components/layout/navi-menu.module.css`
- Modify: `components/layout/navi-menu.tsx`

- [ ] **Step 1: `components/layout/navi-menu.module.css` を作成**

```css
.menu {
  display: flex;
  flex-direction: row;
}

.item {
  color: white;
  cursor: pointer;
  margin-right: 1rem;
  font-size: var(--font-size);
}

.item:hover {
  color: var(--color-accent);
  transition: color 0.2s ease-out;
}
```

- [ ] **Step 2: `components/layout/navi-menu.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Link from "@/lib/router-link"
import styles from "./navi-menu.module.css"

type Item = {
  to?: string
  text: string
  action?: (event: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => void
}

interface Props {
  items: Item[]
}

const Menu: React.FC<Props> = ({ items }) => (
  <div className={styles.menu}>
    {(items || []).map((item, index) => {
      const { action, text, to } = item
      const menuItem = (
        <p className={styles.item} onClick={action}>
          {text}
        </p>
      )
      return (
        <span key={index}>
          {to ? <Link href={to}>{menuItem}</Link> : menuItem}
        </span>
      )
    })}
  </div>
)

export default Menu
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

ナビ右側に `Home` `Profile` `🌅`/`🌃` の 3 項目が並ぶこと、テーマトグルクリックで `<html data-theme>` が変わることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/layout/navi-menu.tsx components/layout/navi-menu.module.css
git commit -m "refactor(layout/navi-menu): swap styled-components to css module"
```

---

## Task 20: `components/layout/navi.tsx` を CSS Module に置換

**Files:**
- Create: `components/layout/navi.module.css`
- Modify: `components/layout/navi.tsx`

- [ ] **Step 1: `components/layout/navi.module.css` を作成**

```css
.header {
  background-color: var(--color-main);
  position: sticky;
  margin-bottom: 1rem;
  top: 0;
  z-index: 1;
}

.header a {
  text-decoration: none;
}
```

- [ ] **Step 2: `components/layout/navi.tsx` を以下に書き換え**

```tsx
import type React from "react"
import NaviLogo from "@/components/layout/navi-logo"
import NaviMenu from "@/components/layout/navi-menu"
import Container from "@/components/ui/container"
import Flex from "@/components/ui/flex"
import { useTheme } from "@/lib/ThemeContext"
import styles from "./navi.module.css"

const Navi: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className={styles.header}>
      <Container>
        <Flex>
          <NaviLogo title="jaxx2104.info" />
          <NaviMenu
            items={[
              { text: "Home", to: "/" },
              { text: "Profile", to: "/profile" },
              { text: theme === "light" ? "🌅" : "🌃", action: toggleTheme },
            ]}
          />
        </Flex>
      </Container>
    </header>
  )
}

export default Navi
```

- [ ] **Step 3: 型チェックと目視 — ここで初めて CSS variables が「テーマ切替で動く」**

```bash
pnpm test
pnpm dev
```

ナビ右端のテーマトグルをクリックして以下を確認:
- `<html data-theme>` が `light` ↔ `dark` でトグル
- ナビ自身の背景色は `--color-main`（ピンク）で変わらない（dark テーマでも `--color-main` は同じ）
- **記事一覧の背景色とテキスト色が dark の値（`#282c35` / `#ffffff`）に切り替わる** — これは `__root.tsx` の `<body>` が `var(--color-background)` / `var(--color-text)` を参照しているため、ようやく Phase 3 の効果が体感できる瞬間

- [ ] **Step 4: Commit**

```bash
git add components/layout/navi.tsx components/layout/navi.module.css
git commit -m "refactor(layout/navi): swap styled-components to css module, theme toggle live"
```

---

## Task 21: `components/features/article/article-info.tsx` を CSS Module に置換

**Files:**
- Create: `components/features/article/article-info.module.css`
- Modify: `components/features/article/article-info.tsx`

- [ ] **Step 1: `components/features/article/article-info.module.css` を作成**

```css
.wrap {
  display: flex;
  margin: 2rem 0 1rem;
  flex-direction: column;
  justify-content: center;
  word-break: break-word;
}

.headingLink {
  text-decoration: none;
  display: block;
  margin: 0.5rem 0;
}

.meta {
  margin: 0.5rem 0;
  display: flex;
  column-gap: 0.5rem;
}
```

設計メモ:
- 元コードでは `<Link>` と meta の `<div>` が **inline `style` 属性**で書かれていた。CSS Module 化のついでに class に整理（`heading-link` / `meta`）

- [ ] **Step 2: `components/features/article/article-info.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Link from "@/lib/router-link"
import Badges from "@/components/ui/badge"
import Heading from "@/components/ui/heading"
import Time from "@/components/ui/time"
import styles from "./article-info.module.css"

interface Props {
  path: string
  title: string
  created_at: string
  categories: string[] | null
  tags: string[] | null
}

const ArticleInfo: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
}) => (
  <div className={styles.wrap}>
    <Link className={styles.headingLink} href={path}>
      <Heading>{title}</Heading>
    </Link>
    <div className={styles.meta}>
      <Time created_at={created_at} />
      <Badges items={categories} primary />
      <Badges items={tags} />
    </div>
  </div>
)

export default ArticleInfo
```

設計メモ:
- `lib/router-link.tsx` のシムは `className` を含む `RouterLink` props を pass-through する設計（Phase 2 Task 4 で `Omit<..., "to" | "children">` した残り全 props を spread）。`className={styles["heading-link"]}` は問題なく届く
- もし届かない場合は `lib/router-link.tsx` の Props 型を確認、`className?: string` を明示的に許容

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

記事詳細ページのタイトル・日付・カテゴリ・タグの表示が現行と同じであることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/features/article/article-info.tsx components/features/article/article-info.module.css
git commit -m "refactor(features/article-info): swap styled-components to css module"
```

---

## Task 22: `components/features/article/article-tile.tsx` を CSS Module に置換

**Files:**
- Create: `components/features/article/article-tile.module.css`
- Modify: `components/features/article/article-tile.tsx`

- [ ] **Step 1: `components/features/article/article-tile.module.css` を作成**

```css
.tileLink {
  text-decoration: none;
}

.container {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease-out;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
}

.container:hover {
  box-shadow: 0 4px 12px var(--color-shadow);
  transform: translateY(-2px);
}

.thumbnail {
  width: 100%;
  height: auto;
  object-fit: cover;
}

.content {
  padding: 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.title {
  color: var(--color-main);
  font-size: var(--font-size);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  letter-spacing: -0.025rem;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.excerpt {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight);
  color: var(--color-text);
  line-height: 1.4;
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
}
```

設計メモ:
- `<Link>` の inline `style={{ textDecoration: "none" }}` は `.tile-link` クラスに集約

- [ ] **Step 2: `components/features/article/article-tile.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Link from "@/lib/router-link"
import styles from "./article-tile.module.css"

interface Props {
  path: string
  title: string
  excerpt?: string
  thumbnail?: string
}

const ArticleTile: React.FC<Props> = ({ path, title, excerpt, thumbnail }) => (
  <Link href={path} className={styles.tileLink}>
    <article className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {thumbnail ? (
          <img
            className={styles.thumbnail}
            src={thumbnail}
            alt={title}
            loading="lazy"
          />
        ) : (
          <p className={styles.excerpt}>{excerpt}</p>
        )}
      </div>
    </article>
  </Link>
)

export default ArticleTile
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/ の記事タイル 109 件のうち、サムネイル付き / excerpt 付きの両方が現行と同じレイアウトで表示されることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/features/article/article-tile.tsx components/features/article/article-tile.module.css
git commit -m "refactor(features/article-tile): swap styled-components to css module"
```

---

## Task 23: `components/features/profile/profile-link.tsx` を CSS Module に置換

元コード `const LinkWrap = styled.div\`\`` は**スタイル無し**のラッパー。CSS Module 化するか、ラッパー自体を `<div>` に戻すかを選ぶ。後者を選択して 1 つ DOM を減らす。

**Files:**
- Modify: `components/features/profile/profile-link.tsx`（CSS Module は不要）

- [ ] **Step 1: `components/features/profile/profile-link.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"

const ProfileLink: React.FC = () => (
  <Section>
    <Container>
      <Display>Links</Display>
      <Flex>
        <div>
          <li>
            <a href="https://github.com/jaxx2104">Github</a>
          </li>
          <li>
            <a href="https://twitter.com/jaxx2104">Twitter</a>
          </li>
          <li>
            <a href="https://www.npmjs.com/~jaxx2104">npm</a>
          </li>
          <li>
            <a href="https://speakerdeck.com/jaxx2104">SpeakerDeck</a>
          </li>
          <li>
            <a href="https://qiita.com/jaxx2104">Qiita</a>
          </li>
          <li>
            <a href="https://note.com/jaxx2104">Note</a>
          </li>
          <li>
            <a href="https://www.npmjs.com/~jaxx2104">Connpass</a>
          </li>
        </div>
      </Flex>
    </Container>
  </Section>
)

export default ProfileLink
```

設計メモ:
- `LinkWrap` は空の styled.div だったので素の `<div>` に降格。視覚差は無い

- [ ] **Step 2: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ の Links セクションがリスト表示されることを確認。

- [ ] **Step 3: Commit**

```bash
git add components/features/profile/profile-link.tsx
git commit -m "refactor(features/profile-link): drop empty styled wrapper"
```

---

## Task 24: `components/features/profile/profile-user.tsx` を CSS Module に置換

`UserWrap` には margin が、`BioWrap` は空 styled.div。後者は素の `<div>` に降格。

**Files:**
- Create: `components/features/profile/profile-user.module.css`
- Modify: `components/features/profile/profile-user.tsx`

- [ ] **Step 1: `components/features/profile/profile-user.module.css` を作成**

```css
.user {
  margin: 3rem auto 2rem;
}
```

- [ ] **Step 2: `components/features/profile/profile-user.tsx` を以下に書き換え**

```tsx
import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import Thumbnail from "./thumbnail"
import styles from "./profile-user.module.css"

interface Props {
  profileImage?: string
}

const ProfileUser: React.FC<Props> = ({
  profileImage = "/images/profile.jpg",
}) => (
  <Section>
    <Container>
      <Flex>
        <div>
          <Display>Futoshi Iwashita</Display>
          <strong>jaxx2104</strong>
          <p>I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST</li>
          <li>2017 ~ 2020: Recruit</li>
          <li>2020 ~ : freee</li>
        </div>
        <div className={styles.user}>
          <Thumbnail src={profileImage} title="jaxx2104" size={160} circle />
        </div>
      </Flex>
    </Container>
  </Section>
)

export default ProfileUser
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ で名前 / 略歴 / プロフィール画像が並ぶことを確認。

- [ ] **Step 4: Commit**

```bash
git add components/features/profile/profile-user.tsx components/features/profile/profile-user.module.css
git commit -m "refactor(features/profile-user): swap styled-components to css module"
```

---

## Task 25: `components/features/profile/profile-work.tsx` を CSS Module に置換

`Anchor = styled.a\`text-decoration: none\`` のみ。CSS Module 化または素の `<a>` + inline `style` のどちらかだが、Module 化で統一する。

**Files:**
- Create: `components/features/profile/profile-work.module.css`
- Modify: `components/features/profile/profile-work.tsx`

- [ ] **Step 1: `components/features/profile/profile-work.module.css` を作成**

```css
.anchor {
  text-decoration: none;
}
```

- [ ] **Step 2: `components/features/profile/profile-work.tsx` の関連箇所を書き換え**

`import styled from "styled-components"` を削除し、`import styles from "./profile-work.module.css"` を追加。

`Anchor` styled component 定義（ファイル末尾）を削除し、JSX 内の `<Anchor key={index} href={item.href}>` を `<a key={index} href={item.href} className={styles.anchor}>` に置換。

最終形:

```tsx
import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import SlideImage from "../../ui/slide-image"
import styles from "./profile-work.module.css"

interface WorkItem {
  src: string
  title: string
  href: string
}

interface Props {
  workItems?: WorkItem[]
}

const ProfileWork: React.FC<Props> = ({
  workItems = defaultWorkItems,
}) => (
  <Section>
    <Container>
      <Display $uppercase>Work</Display>
      <Flex $center>
        {workItems.map((item, index) => (
          <a key={index} href={item.href} className={styles.anchor}>
            <SlideImage
              src={item.src}
              alt={item.title}
              title={item.title}
              animation="fadeIn"
            />
          </a>
        ))}
      </Flex>
    </Container>
  </Section>
)

const defaultWorkItems: WorkItem[] = [
  { src: "/images/kawaii.png", title: "Kawaii.fm", href: "https://kawaii.jaxx2104.info/" },
  { src: "/images/mockup1.png", title: "Yomu(PWA)", href: "https://yomu.jaxx2104.info/" },
  { src: "/images/mockup3.png", title: "Gatstrap(Web)", href: "https://gatstrap.netlify.com/" },
  { src: "/images/mockup2.png", title: "Nikuman(Web)", href: "https://nikuman.jaxx2104.info/" },
  { src: "/images/work1.png", title: "Yomu(iOS)", href: "https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598" },
  { src: "/images/work2.png", title: "Detector(iOS)", href: "https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455" },
]

export default ProfileWork
```

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ の Work アイテム 6 つにフォーカス時下線が出ない（text-decoration: none）ことを確認。

- [ ] **Step 4: Commit**

```bash
git add components/features/profile/profile-work.tsx components/features/profile/profile-work.module.css
git commit -m "refactor(features/profile-work): swap styled-components to css module"
```

---

## Task 26: `components/features/profile/thumbnail.tsx` を CSS Module + `<img>` に置換（next/image 撤去 #2）

`$circle` boolean を `data-circle`、`$size` number を inline `style` で `width`/`height` (px) に置換。同時に `Image from "next/image"` を `<img>` に置換。

**Files:**
- Create: `components/features/profile/thumbnail.module.css`
- Modify: `components/features/profile/thumbnail.tsx`

- [ ] **Step 1: `components/features/profile/thumbnail.module.css` を作成**

```css
.thumbnail {
  position: relative;
  overflow: hidden;
  border-radius: 0;
}

.thumbnail[data-circle] {
  border-radius: 50%;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 2: `components/features/profile/thumbnail.tsx` を以下に書き換え**

```tsx
import type React from "react"
import styles from "./thumbnail.module.css"

interface Props {
  circle?: boolean
  size: number
  src: string
  title: string
}

const Thumbnail: React.FC<Props> = ({ circle, size, src, title }) => (
  <div
    className={styles.thumbnail}
    data-circle={circle ? "" : undefined}
    style={{ width: `${size}px`, height: `${size}px` }}
  >
    <img src={src} alt={title} title={title} width={size} height={size} />
  </div>
)

export default Thumbnail
```

設計メモ:
- 元コードの `width: ${$size || 120}px`. 呼び出し側 `<Thumbnail src=... title=... size={160} circle>` は `size` を**必須**で渡しているため、fallback 120 は使われない。型定義 `size: number`（required）に揃えて fallback を消した
- `next/image` を `<img>` に置換。`object-fit: cover` は `.thumbnail img` セレクタで当てる

- [ ] **Step 3: 型チェックと目視**

```bash
pnpm test
pnpm dev
```

http://localhost:3000/profile/ でプロフィール画像 (160x160 円形) が表示されることを確認。

- [ ] **Step 4: Commit**

```bash
git add components/features/profile/thumbnail.tsx components/features/profile/thumbnail.module.css
git commit -m "refactor(features/thumbnail): swap to css module with native img, drop next/image"
```

---

## Task 27: styled-components 残存の最終確認と依存削除

全コンポーネントの styled-components 撤去が完了したはずなので、grep で 0 件を確認した上で `package.json` から dependency を削除する。

**Files:**
- Modify: `package.json`、`pnpm-lock.yaml`

- [ ] **Step 1: styled-components 残存箇所の最終 grep**

```bash
grep -rln "styled-components" components/ lib/ styles/ app/
```

Expected: 1 件もヒットしない（CLAUDE.md の説明文は本タスクの後で更新）

万一ヒットした場合は対応する CSS Module 化タスクに戻る。

- [ ] **Step 2: dep 削除**

```bash
pnpm remove styled-components @types/styled-components
```

`pnpm-lock.yaml` も同時に更新される。

- [ ] **Step 3: install 後ビルドが通ることを確認**

```bash
rm -rf dist .velite node_modules/.cache
pnpm install --frozen-lockfile
pnpm test
pnpm build
ls dist/client/index.html
```

Expected: 全コマンド exit 0、index.html が生成される。

`Cannot find module 'styled-components'` のような import error が出る場合: Step 1 の grep が漏れていた箇所がある。grep をかけ直して残存箇所を消し、再度 dep 削除。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: drop styled-components dependency after css modules migration"
```

---

## Task 28: 旧 styles と未使用 lib の削除

CSS Module 移行で参照ゼロになったファイルを削除する。

**Files:**
- Delete: `styles/global-style.ts`、`styles/theme.ts`、`lib/useDarkMode.ts`、`lib/storage.ts`

- [ ] **Step 1: 参照無しの最終確認**

```bash
grep -rln "global-style\|styles/theme\|useDarkMode\|@/lib/storage\|from \"./storage\"\|from \"../storage\"" components/ lib/ styles/ app/ scripts/
```

Expected: 1 件もヒットしない。

ヒットした場合は内容を確認:
- `from "./storage"` のような相対 import 残骸 → 削除
- 旧 `@/lib/useDarkMode` の参照 → ThemeContext 経由に置換済みか確認
- `styles/theme` の type import 残骸 → 削除

- [ ] **Step 2: 削除実行**

```bash
rm styles/global-style.ts styles/theme.ts lib/useDarkMode.ts lib/storage.ts
```

- [ ] **Step 3: localforage の参照ゼロ確認（Phase 4 への準備）**

```bash
grep -rln "localforage" lib/ components/ app/ scripts/
```

Expected: 0 件。万一残っている場合（例: `lib/storage.ts` 削除後に他のファイルが参照していた）は、参照箇所を localStorage 直叩きに書き換える。Phase 4 で `pnpm remove localforage` する前提なので、本タスクで参照を絶っておく。

- [ ] **Step 4: 型チェック**

```bash
pnpm test
pnpm build
```

Expected: 全コマンド exit 0。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: drop legacy styles and unused theme storage helpers"
```

`-A` を使うのは削除ファイルの集約のため。`git status -s` で D が 4 件であることを事前確認。

---

## Task 29: ドキュメント (CLAUDE.md) の更新

`components/CLAUDE.md` / `lib/CLAUDE.md` / `styles/CLAUDE.md` / `app/CLAUDE.md` を Phase 3 の現実に合わせて書き換える。

**Files:**
- Modify: `components/CLAUDE.md`
- Modify: `lib/CLAUDE.md`
- Modify: `styles/CLAUDE.md`
- Modify: `app/CLAUDE.md`（または削除）

- [ ] **Step 1: `components/CLAUDE.md` の Styling 節を更新**

末尾の `## Styling` セクションを以下に置換:

```markdown
## Styling

- **CSS Modules** (`*.module.css`) で各コンポーネントのスタイルを管理
- 色・余白・フォントは `styles/tokens.css` の CSS variables (`var(--color-*)` / `var(--font-size-*)` / `var(--font-weight-*)` / `var(--content-width)`) のみ参照
- ダークモードは `<html data-theme="dark">` で切替（`lib/ThemeContext.tsx` の `useTheme()` で API 提供）
- Boolean prop は `data-*` 属性 + CSS attribute selector で表現（例: `data-primary` / `data-center` / `data-variant`）
- 数値で動的に変わる値（size 等）は CSS variable 経由で `style={{ "--icon-size": "..." }}` として渡す
```

- [ ] **Step 2: `lib/CLAUDE.md` を更新**

`### ThemeContext.tsx - Theme Context` セクションを以下に置換:

```markdown
### `ThemeContext.tsx` - Theme Context
ダーク/ライトモードのテーマ管理。`<html data-theme="...">` 属性を直接書き換え、`localStorage` で永続化する。

```typescript
const { theme, toggleTheme } = useTheme()
```

- 初期判定: (1) `<html data-theme>` （`__root.tsx` の inline bootstrap script で先行設定）→ (2) `localStorage["theme"]` → (3) `prefers-color-scheme` の順
- 切替時: state 更新 + `document.documentElement.dataset.theme` 書き換え + `localStorage` 書き込み
```

`### useDarkMode.ts` / `### registry.tsx` / `### storage.ts` セクションを**削除**（いずれもファイルが消えた）。

- [ ] **Step 3: `styles/CLAUDE.md` を更新**

`theme.ts` / `global-style.ts` 関連の記述を削除し、以下に置換:

```markdown
# Styles Directory

グローバルスタイルとテーマトークンを管理するディレクトリ。

## Files

### `tokens.css` - Theme Tokens
CSS custom properties (`--color-*` / `--font-size-*` / `--font-weight-*` / `--content-width` / `--line-height`) を `:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セットで定義する。コンポーネント側は `var(--color-main)` のように参照する。

### `global.css` - Global Styles
`body` / `a` / `ul, ol, li` / 記事本文 (`.content` 配下の `h1-h6` / `p` / `blockquote` / `img` / `pre` / `code` / `.link-card*`) をスタイリングする。記事 HTML は Velite が生成した `dangerouslySetInnerHTML` 由来の DOM のため、Module ではなくグローバル CSS として当てる必要がある。
```

- [ ] **Step 4: `app/CLAUDE.md` を整理**

Next.js App Router 前提の説明を削除し、TanStack Router の `app/routes/` 構成に書き換える:

```markdown
# App Directory

TanStack Start (Vite) のエントリポイントとルート定義を管理するディレクトリ。

## Structure

```
app/
├── client.tsx              # ブラウザエントリ
├── ssr.tsx                 # prerender エントリ
├── router.tsx              # createRouter / getRouter（routeTree を組み立て）
└── routes/
    ├── __root.tsx          # ルートレイアウト（meta / fonts / theme bootstrap script / global css import）
    ├── index.tsx           # トップ（記事一覧、loader で getAllPosts）
    ├── profile.tsx         # /profile/
    └── $.tsx               # 記事詳細（splat ルートで /<permalink>/ にマッチ）
```

## Key Patterns

### Static Site Generation
- TanStack Start の `prerender` 機能で全 permalink を静的書き出し
- `vite.config.mts` の `tanstackStart()` プラグインに Velite 出力の permalink 配列を渡す（決定論的 prerender）
- 出力先は `dist/client/`（`wrangler.toml` の `pages_build_output_dir` と整合）

### Root Layout (`routes/__root.tsx`)
- `head()` API で site-wide meta（charSet / viewport / og:* / twitter:* / favicon / manifest / Google Fonts）を返す
- inline bootstrap script で `<html data-theme>` を localStorage / prefers-color-scheme から先行設定（FOUC 防止）
- `tokens.css` / `global.css` を side-effect import

### Splat Route (`routes/$.tsx`)
- `params._splat` から permalink を組み立て、`getPostByPermalink()` で記事を引く
- `head()` API で記事個別の OGP（title / description / og:image / canonical）を返す
- 404 は `notFound()` + `notFoundComponent`
```

または、Phase 4 で書き直す前提で本ファイルを `rm app/CLAUDE.md` で削除しても良い。**書き直しを採用**するのが PR レビュー時に親切（ディレクトリの説明があるとレビュアーが読みやすい）。

- [ ] **Step 5: 型チェック（CLAUDE.md は tsc 対象外だが念のため）**

```bash
pnpm test
```

Expected: exit 0

- [ ] **Step 6: Commit**

```bash
git add components/CLAUDE.md lib/CLAUDE.md styles/CLAUDE.md app/CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md sections for css modules and tanstack routes"
```

---

## Task 30: CI smoke check に「styled-components 注入が無い」確認を追加

`.github/workflows/test.yml` の Phase 2 smoke を拡張し、prerender HTML に styled-components のランタイム DOM 痕跡が無いことを CI で常時検出する。

**Files:**
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: 既存 smoke ステップの末尾に追加**

`Verify dist artifacts` ステップの run スクリプト末尾に以下を追加:

```yaml
          # Phase 3: ensure styled-components runtime DOM is gone.
          # The `data-styled` attribute is styled-components v6's marker;
          # if we still see it, some component slipped through the css modules
          # migration and is rehydrating styles client-side.
          if grep -rF 'data-styled' dist/client/ ; then
            echo "FAIL: found styled-components runtime DOM in prerendered HTML"
            exit 1
          fi
          # Hashed css asset must be linked from the home page.
          grep -E '<link[^>]*rel="stylesheet"[^>]*assets/[^"]+\.css' dist/client/index.html
```

設計メモ:
- `data-styled` は styled-components v6 が `<style>` 要素に付ける固有属性。これが prerender HTML に出ていれば runtime injection 経路が残っている証拠
- `<link rel="stylesheet" href=".../assets/*.css">` の存在確認で、Vite が tokens.css / global.css をハッシュ付き asset としてバンドルしている証跡を取る

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
if grep -rF "data-styled" dist/client/ ; then
  echo "FAIL: styled-components runtime DOM detected"
  exit 1
fi
grep -E "<link[^>]*rel=\"stylesheet\"[^>]*assets/[^\"]+\\.css" dist/client/index.html
echo OK
'
```

Expected: `OK`

- [ ] **Step 3: Commit + push + CI 確認**

```bash
git add .github/workflows/test.yml
git commit -m "ci: assert no styled-components runtime dom in prerender output"
git push

gh run list --branch modernize-stack-phase1-tanstack-skeleton --limit 1
```

Expected: 最新 run が `success`

CI が落ちた場合の対応: ローカルとの差は `pnpm install` の dep tree 程度。`gh run view <id>` でログを取り、`data-styled` 検出 or `<link rel=stylesheet ... assets/...>` 不検出のどちらが原因かを特定。前者なら styled-components 残存箇所の grep を再度かける、後者なら Vite の CSS asset 出力先（`dist/client/assets/`）が変わった可能性を疑う。

---

## Task 31: Cloudflare Pages Deploy Preview での目視レビュー（視覚回帰チェック）

CI が緑になると Cloudflare Pages が `dist/client` を Preview URL に publish する。Phase 2 完了時の Preview と Phase 3 完了時の Preview を**目視で**比較し、視覚回帰がないことを確認する。

**Files:**
- なし（PR / Preview の操作のみ）

- [ ] **Step 1: PR の現状確認と Preview URL 取得**

```bash
gh pr view --json statusCheckRollup,number,url
```

Cloudflare Pages の deploy preview URL を控える。

- [ ] **Step 2: 比較対象の URL リストを作る**

| 比較 | Phase 2 完了時 | Phase 3 完了時 |
|---|---|---|
| トップ（light） | `https://<phase2 preview>/` | `https://<phase3 preview>/` |
| トップ（dark トグル後） | 同上 | 同上 |
| プロフィール | `/profile/` | `/profile/` |
| 記事 1（最新） | `/<最新 permalink>/` | `/<最新 permalink>/` |
| 記事 2（PHP コードハイライト） | `/php-replace-lf/` | `/php-replace-lf/` |
| 記事 3（リネーム slug） | `/readme-siri/` | `/readme-siri/` |
| 記事 4（リンクカード入り） | `(link-card 利用記事)` | 同上 |

Phase 2 完了時の Preview URL は `gh pr view --comments` か Cloudflare Dashboard の deploy 履歴から取得。

- [ ] **Step 3: 目視確認チェックリスト**

各 URL ペアに対して:
- [ ] 記事タイトル / 本文 / コードブロックが Phase 2 完了時と同じレイアウトで表示
- [ ] **FOUC が消えている**（ページロード時に `<style>` が後から差し込まれる挙動が無い）
- [ ] ナビ右端のテーマトグルをクリックすると、`<html data-theme>` が切り替わり、背景色 / テキスト色が即座に dark テーマ (`#282c35` / `#ffffff`) になる
- [ ] dark テーマでもナビは pink (`--color-main: #e91e63`)、リンクカードや code block の罫線色も dark 用に切り替わる
- [ ] リンクカードのレイアウト (`120px x 100px` の image area) と hover 効果が変わっていない
- [ ] 記事本文中のコードブロック (`pre`) のハイライト（rehype-pretty-code の theme）が変わっていない
- [ ] プロフィールページ Work セクションの fadeIn アニメーションが効く

差異が出た項目を Phase 3 plan の Revisions 表に書き戻す。重大（記事が表示されない、テーマ切替が効かないなど）であれば該当 Task に戻って修正、軽微（マージン 1px 差、文字色の HEX 1 桁差）であれば Revisions に「許容範囲」と注記。

- [ ] **Step 4: 必要なら font-size 系の追加対応**

`slide-image.tsx` の `font-size: undefinedrem` バグ温存に起因して Capture 文字が「親の font-size 継承」表示になる。Phase 2 完了時と挙動が同じなら問題なし、変わっていれば Revisions に記録して別 PR 起票（YAGNI）。

---

## Task 32: spec の Phase 3 完了マーキング

**Files:**
- Modify: `docs/superpowers/specs/2026-05-01-modernize-stack-design.md`

- [ ] **Step 1: section 9 の Phase 3 見出しに完了マークを追加**

`### Phase 3: スタイル全面置換（3〜5 日、最大）` を以下に書き換え:

```markdown
### Phase 3: スタイル全面置換（3〜5 日、最大）（完了: YYYY-MM-DD）

- `styles/tokens.css` に CSS variables（`--color-*` / `--font-size-*` / `--font-weight-*` / `--content-width` / `--line-height`）を `:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セットで定義
- `styles/global.css` に `body` / `a` / `ul,ol,li` / `.content` 配下と `.link-card*` のグローバルスタイルを移植
- `lib/ThemeContext.tsx` を styled-components の `ThemeProvider` 経由から `<html data-theme>` 直接書き換え + localStorage 永続化に作り直し
- `components/**/*.tsx` 23 ファイルを styled-components → `*.module.css` に置換（ui/ → icons/ → layout/ → features/article/ → features/profile/ の順、1 file = 1 commit）
- Boolean prop は `data-*` 属性 + CSS attribute selector、数値 prop は `style={{ "--var": ... }}` の CSS variable 経由で表現
- `next/image` を `<img>` に置換（`thumbnail.tsx`、`slide-image.tsx`）
- `styled-components` / `@types/styled-components` dep を削除
- `styles/global-style.ts` / `styles/theme.ts` / `lib/useDarkMode.ts` / `lib/storage.ts` を削除
- CI smoke を「`data-styled` ランタイム DOM が prerender HTML に無い」「hashed CSS asset が `<link rel=stylesheet>` で参照されている」の 2 条件で拡張
- **Gate 完了**: PR <番号> の Cloudflare Pages Preview で home / profile / 既知 5 記事を Phase 2 完了時と目視比較し、視覚回帰なし + ダークモード切替が CSS variable 経由で完了することを確認
```

- [ ] **Step 2: section 12「Phase 0 検証結果と未決事項」の `react-share` 残課題を解消ステータスに更新**

「`react-share` の利用箇所と styled-components 依存の有無は Phase 3 着手時に再確認。」を解消済みに移し、本文を以下に置換:

```markdown
- `react-share`: Phase 3 Task 1 で `react-share` v6.x の dist を grep し、styled-components 依存ゼロを確認。引き続き `icon-share.tsx` で利用継続。`<style>` ランタイム注入の心配なし。
```

- [ ] **Step 3: section 10「段階的マージ」の改訂注を追記**

```markdown
**Phase 3 完了時点の判断 (YYYY-MM-DD)**: Phase 1 + Phase 2 + Phase 3 が同一ブランチで揃い、Cloudflare Pages Preview に「styled-components ランタイムを持たない、CSS variables ベースで dark テーマ切替が動く」Vite 成果物が出る状態に。FOUC は解消、視覚的同等性も確保。残るは Phase 4（旧依存撤去）と Phase 5（React 19 + 仕上げ）のみ。`pnpm build` の出力サイズと初回ロード時間が Phase 2 比でどれだけ縮んだかは Phase 5 完了時に計測する。
```

- [ ] **Step 4: Commit + push**

```bash
git add docs/superpowers/specs/2026-05-01-modernize-stack-design.md
git commit -m "docs(spec): mark phase 3 complete with css modules migration gate"
git push
```

PR の本文を `gh pr edit --body` で更新し、Phase 1 / Phase 2 / Phase 3 の 3 フェーズをカバーする summary に書き直す（任意）。

---

## Self-Review チェックリスト

実装完了後に以下を確認:

1. **Spec Phase 3 全項目のカバレッジ**
   - `styles/theme/tokens.css` に CSS variables → Task 2（パス名は `styles/tokens.css` に変更、本 plan の Conventions で確定）
   - `<html data-theme>` 切替、ThemeContext は localStorage 永続化を維持 → Task 4 / 5
   - `components/**/*.tsx` の styled-components を `*.module.css` に置換（ui/ → layout/ → features/article/ → features/profile/、本 plan では `icons/` を `ui/` の後に追加） → Task 6〜26
   - `lib/registry.tsx` 削除 → Phase 2 で済（`Untouched` セクション参照）
   - `styled-components` 依存除去 → Task 27
   - **Gate**: 視覚回帰なし → Task 31

2. **Spec section 12 の Phase 3 着手前タスク**
   - `react-share` の styled-components 依存有無 → Task 1 Step 4 + Task 32 Step 2

3. **placeholder 残留なし**: タスク内に "TBD"、"TODO"、"後で書く" が残っていないか

4. **型整合**:
   - `lib/ThemeContext.tsx` の `useTheme()` 戻り値型が、navi.tsx の destructure (`{ theme, toggleTheme }`) と整合
   - `lib/router-link.tsx` のシムが `className` prop を pass-through する（article-info.tsx / article-tile.tsx / footer.tsx の `<Link className={styles.X}>` で利用）
   - 各コンポーネントの `style={{ "--icon-size": ... }}` 系が `as React.CSSProperties` キャストを伴う（CSS custom property は型定義に無いため）

5. **シェルとパス整合**: fish 環境で `pnpm` 経由のコマンドが通る、`bash -e -c '...'` のローカル CI 再現が fish からでも動く（`bash -e -c` 自体は明示的に bash を呼ぶので問題なし）

6. **branch / merge 運用**:
   - 全 commit が `modernize-stack-phase1-tanstack-skeleton` ブランチ上にある
   - main 側に Next.js コードが残っており、本ブランチでのみ Vite + CSS Modules 化が進む
   - PR の本文を Phase 1 + Phase 2 + Phase 3 の 3 フェーズ反映する形に更新

7. **本番影響ゼロの確認**: Cloudflare Pages の `build.sh` は Phase 2 で `pnpm build` (Vite) に統一済み。本ブランチの変更は preview にのみ反映、main は依然 Next.js のままなので本番に影響なし

8. **Phase 0 で得た build artifact pitfall への準拠**:
   - tokens.css / global.css は静的ファイルで Velite 出力依存なし。`.velite` 不在状態でも import エラーにならない
   - `as const` の SDK 引数渡しは本フェーズでは発生しない（CSS Module の `styles` import は Vite の `*.d.ts` 経由で `Record<string, string>` 型）

9. **コンポーネント置換漏れチェック**: `grep -rln "styled-components" components/ lib/ styles/ app/` で 1 件もヒットしない（Task 27 Step 1 と重複だが二重確認）

10. **CSS Module の class 名タイポ検出**: tsc では検出できない。Task 31 の dev / preview 目視レビューで全画面を 1 通り見て、無 style の生 DOM が出ていないか確認
