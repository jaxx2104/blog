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
    ├── index.tsx           # トップ（記事一覧の1ページ目）
    ├── page.$page.tsx      # 記事一覧の2ページ目以降（/page/2/ ...）
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
- `params._splat` から permalink を組み立て、`getPostByPermalink()` でメタデータを引く
- 本文は `getPostBody(bodyId)` で別チャンクから非同期に取る（loader が async）
- `head()` API で記事個別の OGP（title / description / og:image / canonical）を返す
- 404 は `notFound()` + `notFoundComponent`

### Paginated Index (`routes/index.tsx` / `routes/page.$page.tsx`)
- ページ分割の算術は `components/features/article/pagination.ts` に集約。`vite.config.mts` も同じモジュールを import してプリレンダー対象の URL を組み立てる（`crawlLinks: false` なので、列挙し漏れたページは生成されない）
- 1ページ目は `/` のみ。`/page/1/` は存在せず、`parsePageParam` がゼロ埋め・範囲外・非数値とあわせて弾く（canonical URL を1つに保つため）
- 2ページ目以降は `<title>` を分けている（重複タイトル回避）
