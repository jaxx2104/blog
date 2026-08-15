# App Directory

TanStack Start のエントリポイントと、`routes/` のルート定義。

## Prerender

- 出力先は `dist/client/`（`wrangler.toml` の `pages_build_output_dir` と整合）
- プリレンダー対象の URL は `vite.config.mts` が Velite 出力から組み立てて `tanstackStart()` に渡す
- `crawlLinks: false`。記事本文の OGP リンクカードに埋まった protocol-relative URL (`//host/...`) をクローラが外部サイトとして辿ってしまうため。この結果、URL の列挙から漏れたページは生成されない

## Root Layout (`routes/__root.tsx`)

- inline bootstrap script が `<html data-theme>` を localStorage / prefers-color-scheme から先行設定する（FOUC 防止）
- `head()` の links はバンドルに載り、ハイドレーション時に React が再挿入する。プリレンダー済み HTML から link タグを消しても取得は止まらない（web フォント全廃の計測中に、HTML から preload を削っただけの版が woff2 を落とし続けて判明した）。消すならここを直す
- `head()` の links に `rel="stylesheet"` を置くと、TanStack の Asset が React 19 の `precedence="default"` を付けて render-blocking にしてしまう。非同期に読みたい stylesheet があるなら `head()` 以外の経路が要る
- web フォントは配信していない。理由と戻すときの注意は `styles/CLAUDE.md`

## Routes

- `$.tsx`（記事詳細）: loader が `getPost(permalink)` で `{ meta, body }` を取り、`head()` が `loaderData.meta` から OGP を組み立てる
- `index.tsx` / `page.$page.tsx`（記事一覧）: loader は `getIndexPage(n)` で1ページぶんだけ取る。全記事のメタデータを読むと、それがバンドルに載って全ページに配られる
- 1ページ目は `/` のみで `/page/1/` は存在しない（canonical URL を1つに保つため）。範囲外かどうかは `parsePageParam` では判定せず、ページ単位ファイルが無いことが範囲チェックになっている
- `404.tsx` は Cloudflare Pages 用の `404.html` を出すためだけに存在する。理由はルートの `CLAUDE.md`
- ページ分割の算術は `lib/pagination.ts`。ビルドとコンテンツ層も同じモジュールを使う
- 記事データは `lib/posts.ts` 経由で URL から fetch する。import しない（`lib/CLAUDE.md`）
