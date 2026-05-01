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
| ホスティング | Cloudflare Pages（現状維持） | 静的書き出し成果物を配信。`build.sh` が `CF_PAGES_BRANCH` で main = `pnpm build` (Next.js → `out/`)、それ以外 = `pnpm build:vite` (TanStack Start → `dist/client/`) に分岐し、移行ブランチは `wrangler.toml` で出力ディレクトリを上書きする。当初 spec は誤って Netlify と記載していたが Phase 1 で実態に整流した |
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
2. `vite build` を実行 → TanStack Start の prerender が全 slug について `dist/client/<slug>/index.html` を生成（client / server を分離した出力）
3. Cloudflare Pages が `dist/client/` を配信（`wrangler.toml` で `pages_build_output_dir` を上書き）

## 4. ディレクトリ構成（移行後）

```
.
├── app/
│   ├── routes/
│   │   ├── __root.tsx          # ルートレイアウト（Providers, GlobalStyle 相当）
│   │   ├── index.tsx           # トップ（記事一覧）
│   │   ├── profile.tsx         # /profile
│   │   └── $.tsx               # 記事詳細（splat ルートで /<slug>/ にマッチ）
│   ├── router.tsx              # createRouter() / getRouter() (TanStack Start runtime entry)
│   └── routeTree.gen.ts        # tanstack/router-plugin が自動生成（gitignore + tsconfig exclude）
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
├── vite.config.mts             # TanStack Start プラグイン (.mts は ESM 必須のため)
├── tsr.config.json             # TanStack Router の routesDirectory 指定
├── wrangler.toml               # Cloudflare Pages の pages_build_output_dir 上書き
├── build.sh                    # Cloudflare Pages の per-branch build エントリ
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

### Permalink ルックアップ（Phase 1 で確定）

`app/routes/$.tsx` の loader は、リクエスト URL を Velite 出力 `posts[].permalink` と完全一致で照合して該当記事を返す。`permalink` は `lib/content/schema.ts` の `transform` で `data.path ?? "/" + data.slug.split("/").pop() + "/"` として算出済み。

歴史的リネームの 4 件（`2017-08-04-listening-book → /readme-siri/`、`2018-11-15-smarthome-ph2 → /smarthome-xiaomi/`、`2019-05-07-googlehome-app-debut → /dialogflow-raspberrypi/`、`2025-01-23-syntax-highlight-test → /2025-01-23-syntax-highlight-test/`）も `permalink` を介してそのまま照合できる。slug ベースのルックアップは行わない。

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

### Phase 0: 検証（1〜2 日）（完了: 2026-05-01）
- `velite.config.ts` を作り、`content/posts/**/index.md` を全件パース
- shiki + rehype-pretty-code をパイプラインに移植
- 画像コピー asset handler を実装
- 出力 JSON の件数 / 失敗件数 / 画像 URL を確認
- スラッグの階層構造（`splat` が必要か）を判定
- **Gate**: 既存 `getAllPosts()` の出力と要素数・主要フィールドが一致
- **Gate 完了**: 2026-05-01 時点で Velite 107 件と Legacy 109 件のうち、Velite で取れる 107 件は title・slug が一致。Legacy のみに存在する 2 件 (`2013-09-05-iphoto-photobook`, `2024-06-10-jaxx-keycaps`) は dead な画像参照に起因する既存の content gap で、Phase 1 着手前に content 側で別途対応する。

### Phase 1: TanStack Start ひな型（1 日）（完了: 2026-05-01）
- `vite.config.mts`, `app/routes/__root.tsx`, `app/routes/index.tsx`, `app/router.tsx` を最小構成（vite.config は ESM のため `.mts`）
- `prerender` を有効化、Cloudflare Pages Deploy Preview で空ページを表示
- `tsconfig.json` を `target: ES2022` 化、`next.config.mjs` の `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` を撤廃
- `pnpm dev:vite` / `pnpm build:vite` / `pnpm preview:vite` を Next.js scripts と並立で追加
- 本ブランチの `wrangler.toml` で `pages_build_output_dir = ./dist/client/` を指定し、`build.sh` が `CF_PAGES_BRANCH` で main = `pnpm build`、それ以外 = `pnpm build:vite` に分岐。main の本番ビルドは Next.js のまま維持
- spec section 2 の「ホスティング」記述は誤り（Netlify ではなく Cloudflare Pages）。Phase 1 で Cloudflare Pages 前提に整流（dashboard build command を `bash build.sh` に変更）
- **Gate 完了**: PR #683 の Cloudflare Pages Deploy Preview に Phase 1 stub のページが表示

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
- Cloudflare Pages の `build.sh` 分岐を撤去し、main 単独で `pnpm build:vite` のみを呼ぶ形に整理
- `package.json` の `description` を実態（"A static blog by jaxx2104"）に修正

## 10. テスト / 検証戦略

### 静的検証（CI 必須）
- `tsc -p tsconfig.json`
- `biome ci .`
- `velite build` を `pnpm build` の前段に実行（Zod 失敗で CI 落ち）

### ビルド検証
- `vite build` で全ページが prerender される
- `dist/client/` 配下の `index.html` 数が既存 `out/` の数と整合

### スモーク E2E（Playwright を 1 ファイル追加）
- トップ：記事カードが N 件以上ある
- 任意の記事 1 本：本文 H1 / 公開日 / コードブロック / OGP メタが存在
- プロフィール：主要セクションが描画
- ダークモード切替：`<html data-theme>` がトグルされ、`localforage` に保存
- CI で `pnpm exec playwright test --project=chromium` を実行

### ビジュアル差分（Phase 3 中の手動チェック）
- 現行プロダクション URL と Cloudflare Pages Deploy Preview を、同じ記事 3 本＋トップ＋プロフィールで目視比較

### 段階的マージ
- 全フェーズを 1 本のブランチで実施。main は移行完了まで Next.js のまま維持
- Phase 1〜2 完了時点で Cloudflare Pages Deploy Preview をユーザーレビュー
- Phase 3 完了時点で再度 Preview レビュー
- Phase 5 通過後に main へマージ
- **改訂（2026-05-01）**: Phase 0 は既存ランタイムに一切手を触れない純粋な追加であり、CI の継続的な健全性チェックを早期に得られる利点が大きいため、単独で main にマージする方針に変更した。Phase 1 以降は当初方針通り 1 本のブランチで進める可能性が高いが、各 Phase の完了時点で同様の判断（独立 merge できるか）を行う。
- **Phase 1 完了時点の判断（2026-05-01）**: 本フェーズは Next.js を残したまま TanStack Start ひな型を追加するのみで、Cloudflare Pages Preview のみ Vite 成果物に切替えている。main の本番ビルドには影響しないが、Phase 2 で記事描画を loader に移すまで Vite 成果物には実コンテンツが無いため、**Phase 1 単独では main にマージしない**。Phase 2 と束ねて Preview レビューを受けたうえで判断する。なお Phase 1 完了時点で `build.sh` のみ main に直接 push 済み（Cloudflare Pages dashboard が `bash build.sh` を呼ぶための無害な土台で、main の挙動は実質変わらない）。

### ロールバック
- 移行ブランチでの大変更のため、main を Next.js のままキープ
- 問題発生時は Cloudflare Pages 上で前回成功デプロイへロールバック
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

## 12. Phase 0 検証結果と未決事項

### 解消済み

1. **slug の階層構造**: 全 109 件が `/<single-segment>/` 形式（slash 数 1）。splat ルート `$.tsx` で問題なくカバー可能。ただし 4 件は slug と `frontmatter.path` が一致しない（歴史的リネーム）: `2017-08-04-listening-book → /readme-siri`、`2018-11-15-smarthome-ph2 → /smarthome-xiaomi`、`2019-05-07-googlehome-app-debut → /dialogflow-raspberrypi`、`2025-01-23-syntax-highlight-test → /2025-01-23-syntax-highlight-test`。Phase 1 のルーター設計では slug ではなく `permalink`（`frontmatter.path`）でルックアップする方針で確定。
2. **Velite と既存 getAllPosts の整合**: Phase 1 Task 1 で 2 件の dead-image content gap を解消した結果、Velite と Legacy がともに 109 件で一致（`pnpm verify:velite` の `OK: counts and titles match`）。
3. **画像コピー先**: Velite の `output.assets` を `public/images/posts/`、`output.base` を `/images/posts/` にすることで既存 URL 形状（`/images/posts/<slug>/<file>`）と整合。`clean: true` 設定下でも `public/images/posts/` 配下の既存サブディレクトリは保持されることを確認済み。
4. **歴史的リネームスラッグ 4 件**: section 5「Permalink ルックアップ」を参照。`permalink` を一次キーとして loader でルックアップする方針を Phase 1 で確定。実装は Phase 2 で `app/routes/$.tsx` に。
5. **2 件の dead-image content gap** (`2013-09-05-iphoto-photobook`、`2024-06-10-jaxx-keycaps`): Phase 1 Task 1 で content 側の dead 参照を削除済み。Velite 出力 109 件に揃った。

### 残課題（Phase 2 以降で解消）

- **OGP 画像の生成パイプライン**（`scripts/`）の確認は Phase 2 で実施。
- **`react-share` の利用箇所と styled-components 依存の有無**は Phase 3 着手時に再確認。
- **`velite.config.ts` の tsconfig exclude と `@ts-expect-error`** は Phase 4 で `lib/posts.ts` と一緒に再評価する。

### Phase 0 ノート

- `velite.config.ts` は `tsconfig.json` の `exclude` に入れている。`scripts/verify-velite.ts` が dynamic に `.velite/index.js` を import すると、生成された `.velite/index.d.ts` が `velite.config.ts` を type-import で取り込み、project tsconfig に引きずり込まれるため。Phase 4 で legacy `lib/posts.ts` と一緒に再評価する。

## 13. 参考リンク

- TanStack Start: https://tanstack.com/start
- TanStack Router: https://tanstack.com/router
- Velite: https://velite.js.org/
- shiki / rehype-pretty-code: https://rehype-pretty.pages.dev/
- CSS Modules（Vite）: https://vite.dev/guide/features.html#css-modules
