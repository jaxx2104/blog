# 技術スタック モダン化 設計仕様

- **対象リポジトリ**: `jaxx2104/blog`
- **作成日**: 2026-05-01
- **作成者**: Futoshi Iwashita（ブレインストーミング: Claude Code）
- **ステータス**: Draft（ユーザーレビュー待ち）

## 1. 背景と目的

ブログサイトの技術スタックを「新しいスタックの体験」を主目的にモダン化する。学びと実利を両立させ、ランタイム CSS-in-JS とフレームワーク依存を減らす。

### 動機
- React 18 / styled-components 6 / Next.js 15 (App Router + `output: 'export'`) という構成は機能しているが、ランタイム CSS-in-JS のコストや、`react-helmet`・`font-awesome` 4.x の重複など細かな負債が残る
- 個人ブログという自由度の高い領域で、新しめのフレームワーク・スタイリング・コンテンツ層を試すことで知見を蓄える
- Next.js は強力だが、本サイトの実態（純静的ブログ）に対して機能過多。より素直なツール選定で運用負荷を下げる

### スコープ外
- ブログコンテンツ自体（記事・画像）の編集
- デザインそのものの刷新（既存ビジュアルを移行後も再現することが前提）
- CMS 化、認証、コメント機能などの新機能追加
- パフォーマンス計測の自動化基盤構築
- 単体テスト導入（重大回帰検出用のスモーク E2E のみ追加）

## 2. 採用技術と廃止技術

### 採用
| 領域 | 技術 | 役割 |
|------|------|------|
| ビルド/開発サーバ | Vite | バンドラ・dev server |
| フレームワーク | TanStack Start | Vite 上で動く React メタフレームワーク。SSG（prerender）で静的書き出し |
| ルーティング | TanStack Router | 型安全なファイルベース／コードベースルーティング |
| スタイリング | CSS Modules + CSS variables | ゼロランタイム、Vite ネイティブ。テーマは CSS variables |
| コンテンツ層 | Velite | Zod スキーマで frontmatter を検証し、型付き JSON を生成 |
| Markdown 処理 | shiki + rehype-pretty-code（Velite 経由） | コードハイライト |
| ホスティング | Netlify（現状維持） | 静的書き出し成果物を配信 |
| 言語 | TypeScript 5.8 strict（target: ES2022 へ更新） | 既存維持＋ターゲット更新 |
| ランタイム | React 19 | Phase 5 で 18 → 19 |
| パッケージマネージャ | pnpm 9.x | 既存維持 |
| 静的検査 | Biome 2.x、textlint | 既存維持 |

### 廃止
| 廃止対象 | 理由 / 置き換え |
|---------|----------------|
| Next.js（`next`, `@next/mdx`, `next-env.d.ts`, `next.config.mjs`）| TanStack Start に置換 |
| styled-components（`styled-components`, `@types/styled-components`, `lib/registry.tsx`）| CSS Modules に置換 |
| react-helmet（`react-helmet`, `@types/react-helmet`）| TanStack Router の `head()` API に置換 |
| font-awesome 4.7（CSS）| `@fortawesome/react-fontawesome` v6 系に統一 |
| react-lazyload | `loading="lazy"` で代替 |
| `lib/image-utils.ts`（base64 dataURI 変換）| Velite asset handler が `public/` に画像をコピーする方式に置換 |

### 維持（変更なし）
- `localforage`（ダークモード状態の永続化用途）
- `react-share`（シェアボタン）
- `@fortawesome/react-fontawesome` v6 系
- `gray-matter` 等：Velite 内部依存として実質残るが、アプリ側からは直接参照しない
- `date-fns`、`open-graph-scraper`、`modern-normalize`

## 3. アーキテクチャ概要

```
ブラウザ
   ↑ 静的 HTML + CSS Modules + 最小 JS（Islands）
TanStack Start (Vite, prerender mode)
   ↑ ルート定義: app/routes/*
   ↑ データ取得: route loader → Velite が出力した型付き JSON を import
   ↑ <head>: TanStack Router の head() API
Velite (build step)
   ↑ content/posts/**/index.md を読み、Zod で frontmatter を検証
     shiki でコードハイライトし、画像を public/posts/[slug]/ にコピー
   → .velite/index.{js,d.ts} を生成
content/posts/[slug]/index.md
```

### ビルドフロー
1. `velite build` を実行 → `.velite/*.{js,d.ts}` を生成
2. `vite build` を実行 → TanStack Start の prerender が全 slug について `dist/<slug>/index.html` を生成
3. Netlify が `dist/` を配信

## 4. ディレクトリ構成（移行後）

```
.
├── app/
│   ├── routes/
│   │   ├── __root.tsx          # ルートレイアウト（Providers, GlobalStyle 相当）
│   │   ├── index.tsx           # トップ（記事一覧）
│   │   ├── profile.tsx         # /profile
│   │   └── $.tsx               # 記事詳細（splat ルートで /<slug>/ にマッチ）
│   ├── client.tsx              # ブラウザエントリ
│   └── ssr.tsx                 # prerender エントリ
├── components/                 # 既存資産流用、styled → *.module.css に置換
│   ├── features/article/
│   ├── features/profile/
│   ├── layout/
│   ├── ui/
│   └── icons/
├── lib/
│   ├── posts.ts                # Velite 出力の再エクスポート / セレクタ関数
│   ├── theme/
│   │   ├── tokens.css          # CSS variables（light / dark）
│   │   └── ThemeContext.tsx    # data-theme 切替、localforage で永続化
│   ├── storage.ts              # 既存 localforage ラッパー、維持
│   └── link-card.ts            # 既存ロジック維持
├── styles/
│   ├── global.css              # modern-normalize + base スタイル
│   └── theme/                  # CSS variables 定義（旧 theme.ts の置換先）
├── content/posts/[slug]/index.md   # 既存記事ソース
├── public/                     # Velite が記事画像をここへコピー
├── velite.config.ts            # Zod スキーマ + shiki 設定 + 画像 asset handler
├── vite.config.ts              # TanStack Start プラグイン
├── tsconfig.json               # target: ES2022, strict, paths
├── biome.json                  # 維持
└── package.json
```

### 削除されるファイル
- `next.config.mjs`
- `next-env.d.ts`
- `lib/registry.tsx`（styled-components SSR レジストリ）
- `lib/image-utils.ts`（Velite に移譲）
- `styles/global-style.ts`（`styles/global.css` に置換）
- `styles/theme.ts`（CSS variables 定義に置換）
- `app/[...slug]/`（`app/routes/$.tsx` に置換）

## 5. ルーティング設計

| URL | ルートファイル | 備考 |
|-----|---------------|------|
| `/` | `app/routes/index.tsx` | 記事一覧 |
| `/profile/` | `app/routes/profile.tsx` | プロフィール |
| `/<slug>/` | `app/routes/$.tsx` | 記事詳細。splat で `/<slug>/` 形式（階層含む可能性あり）にマッチ |

### prerender 戦略
- `vite.config.ts` の TanStack Start プラグイン設定で、`prerender.crawlLinks: true` ＋静的に既知のエントリ（全 slug）を渡す
- Velite の出力からビルド時に slug 一覧を取得し、prerender に注入する
- 動的ルートは存在しない（loader はビルド時のみ評価）

### URL 互換性
- 現状 `output: 'export'` + `trailingSlash: true` のため URL は `/<slug>/` 形式で末尾スラッシュ付き（`/posts/` 接頭辞なし）
- 移行後も同形式（接頭辞なし、末尾スラッシュ付き）で完全互換を維持する
- slug が階層を含むケース（Phase 0 で確認）も `$.tsx`（splat）でカバーされる
- `/`（一覧）、`/profile/` は具体ルートが優先されるため splat と衝突しない

## 6. データフロー（記事レンダリング）

```
content/posts/<slug>/index.md
    ↓ velite build
.velite/posts.json  ←  型: Post[]
    ↓ import
lib/posts.ts        ←  getAllPosts() / getPostBySlug() を再定義
    ↓ route loader
app/routes/$.tsx
    ↓ <Article post={post} />
components/features/article/article.tsx
```

### Velite スキーマ（要点）
```ts
import { defineCollection, s } from "velite"

export const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/index.md",
  schema: s.object({
    title: s.string(),
    date: s.isodate(),
    description: s.string().optional(),
    cover: s.image().optional(),       // public/ にコピーし URL を返す
    tags: s.array(s.string()).default([]),
    slug: s.path(),
    body: s.markdown(),                // shiki + rehype-pretty-code
    excerpt: s.excerpt(),
  }),
})
```

`cover` 以外の本文中画像は markdown のリンクとして書かれているので、Velite の `s.markdown()` パイプラインに `remark-copy-linked-files` 相当の処理を追加し、`public/posts/<slug>/` へコピーする。詳細は Phase 0 で検証。

## 7. スタイリング設計

### 方針
- 各コンポーネントは隣接する `*.module.css` を持ち、`import styles from "./X.module.css"` で参照
- 色・余白・フォントは CSS variables のみ参照
- ダークモードは `<html data-theme="dark">` で切替

### CSS variables（抜粋）
```css
:root,
[data-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-primary: #2f80ed;
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  /* ... */
}

[data-theme="dark"] {
  --color-bg: #0d1117;
  --color-text: #e6edf3;
  --color-primary: #58a6ff;
  --color-muted: #8b949e;
  --color-border: #30363d;
  /* ... */
}
```

### ThemeContext
- `useDarkMode` 相当のロジックは維持。`localforage` で永続化、システム設定をフォールバック
- React の state とは別に `<html>` の `data-theme` 属性を直接書き換え、SSR/prerender 後の初期表示でちらつかないようにする（インライン script で先頭で読み込む）

## 8. Head / メタデータ設計

`react-helmet` を撤去し、TanStack Router の `head()` API（ルートまたはページごとに head 要素を返す）に統一。

### 各ページが返す head 要素
- `<title>`
- `<meta name="description">`
- `<meta property="og:*">`（title, description, type, url, image）
- `<meta name="twitter:*">`
- `<link rel="canonical">`

記事ページの OGP 画像は、現状の生成方法（`scripts/` または既存の OGP 自動生成があれば踏襲）を Phase 2 で再設計する。今は実装詳細を保留し、最低限「記事の cover 画像があればそれを使う」をデフォルトとする。

## 9. 移行ステップ

### Phase 0: 検証（1〜2 日）
- `velite.config.ts` を作り、`content/posts/**/index.md` を全件パース
- shiki + rehype-pretty-code をパイプラインに移植
- 画像コピー asset handler を実装
- 出力 JSON の件数 / 失敗件数 / 画像 URL を確認
- スラッグの階層構造（`splat` が必要か）を判定
- **Gate**: 既存 `getAllPosts()` の出力と要素数・主要フィールドが一致

### Phase 1: TanStack Start ひな型（1 日）
- `vite.config.ts`, `app/routes/__root.tsx`, `app/routes/index.tsx` を最小構成
- `prerender` 設定、Netlify Preview デプロイ動作確認（中身は仮）
- `tsconfig.json` を `target: ES2022` 化、`ignoreBuildErrors` 相当を撤廃
- **Gate**: 空ページが Netlify Preview で表示

### Phase 2: ルートとデータ層の移植（2〜3 日）
- `$.tsx` の loader で Velite 出力を import → 記事描画
- `index.tsx` で記事一覧
- `profile.tsx` でプロフィール
- `head()` API で OGP / title / description を移行
- 画像は Velite が `public/` に配置済みの URL を使用
- **Gate**: 全記事と一覧が表示され、OGP が現行と同等

### Phase 3: スタイル全面置換（3〜5 日、最大）
- `styles/theme/tokens.css` に CSS variables を定義
- `<html data-theme>` 切替、`ThemeContext` は localforage 永続化を維持
- `components/**/*.tsx` の styled-components を `*.module.css` に置換
  - 移行は機能単位で進める: `ui/` → `layout/` → `features/article/` → `features/profile/`
  - 1 コンポーネントずつ手動目視確認
- `lib/registry.tsx` 削除、`styled-components` 依存除去
- **Gate**: 視覚回帰なし（手動チェック、必要なら scratch でスクリーンショット差分）

### Phase 4: 旧依存撤去（半日）
- `next`, `@next/mdx`, `react-helmet`, `react-lazyload`, `font-awesome`(4.x), `styled-components`, `@types/styled-components`, `@types/react-helmet` を削除
- `next.config.mjs`, `next-env.d.ts` を削除
- `image-utils.ts` 削除
- `react-lazyload` 利用箇所を `loading="lazy"` に置換
- **Gate**: `pnpm install` 後にビルド・型チェック・Biome すべて通る

### Phase 5: 仕上げ（半日〜1 日）
- React 18 → 19（TanStack Start の対応バージョンを前提に）
- `tsc -p .` を CI で必須化
- Netlify 本番切替、リダイレクト確認
- `package.json` の `description` を実態（"A static blog by jaxx2104"）に修正

## 10. テスト / 検証戦略

### 静的検証（CI 必須）
- `tsc -p tsconfig.json`
- `biome ci .`
- `velite build` を `pnpm build` の前段に実行（Zod 失敗で CI 落ち）

### ビルド検証
- `vite build` で全ページが prerender される
- `dist/` 配下の `index.html` 数が既存 `out/` の数と整合

### スモーク E2E（Playwright を 1 ファイル追加）
- トップ：記事カードが N 件以上ある
- 任意の記事 1 本：本文 H1 / 公開日 / コードブロック / OGP メタが存在
- プロフィール：主要セクションが描画
- ダークモード切替：`<html data-theme>` がトグルされ、`localforage` に保存
- CI で `pnpm exec playwright test --project=chromium` を実行

### ビジュアル差分（Phase 3 中の手動チェック）
- 現行プロダクション URL と Netlify Preview を、同じ記事 3 本＋トップ＋プロフィールで目視比較

### 段階的マージ
- 全フェーズを 1 本のブランチで実施。main は移行完了まで Next.js のまま維持
- Phase 1〜2 完了時点で Netlify Preview をユーザーレビュー
- Phase 3 完了時点で再度 Preview レビュー
- Phase 5 通過後に main へマージ

### ロールバック
- 移行ブランチでの大変更のため、main を Next.js のままキープ
- 問題発生時は Netlify 上で前回成功デプロイへロールバック
- URL 互換性が崩れた場合は `_redirects` を生成

## 11. 主要なリスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Velite が一部記事の frontmatter で失敗する | コンテンツ欠損 | Phase 0 で全件パースし、エラー件数を可視化。スキーマ側を実データに合わせる |
| 画像のコピー先 URL が現行と異なり SEO に影響 | OGP / 検索インデックス劣化 | Phase 2 で URL 構造を確認、必要なら `_redirects` で旧 URL を維持 |
| TanStack Start の prerender が一部 slug を取りこぼす | 記事が 404 になる | Phase 1 で Velite 由来 slug を明示的に prerender エントリへ注入 |
| styled-components → CSS Modules の視覚回帰 | デザイン崩れ | Phase 3 で機能単位の手動目視チェックを必須化 |
| React 19 と TanStack Start 系 / Velite 系の互換 | ビルド失敗 | Phase 5 で実施、問題が出たら React 18 のまま完了させ、19 化は別 PR に分離 |
| ダークモード初期表示のちらつき | UX 劣化 | `<head>` でインライン script を実行し、`localforage` 同期前に system preference を `data-theme` に反映 |
| OGP 自動生成パイプラインの欠落 | 記事 OGP 画像が出ない | Phase 2 で現行の生成方式を再確認、cover 画像フォールバックを実装 |

## 12. 未決事項（Phase 0 で確定する項目）

1. 既存 slug が階層を含むか → splat ルート `$.tsx` が当面の前提。階層を含まないことが確認できれば `$slug.tsx`（dynamic）にしてもよい
2. OGP 画像の生成パイプラインが現状どこに存在するか
3. localforage を使うのが ThemeContext 以外にあるか（ある場合は維持対象を明示）
4. `react-share` を使っているコンポーネントが styled-components に依存していないか、CSS Modules 化の対象範囲を確定

## 13. 参考リンク

- TanStack Start: https://tanstack.com/start
- TanStack Router: https://tanstack.com/router
- Velite: https://velite.js.org/
- shiki / rehype-pretty-code: https://rehype-pretty.pages.dev/
- CSS Modules（Vite）: https://vite.dev/guide/features.html#css-modules
