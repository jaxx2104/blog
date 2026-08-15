# Lib Directory

コンテンツの読み出しと、ビルド時に使う純関数群。

### `posts.ts` - Blog Post Data
Velite が書き出したコンテンツファイルを、ルートから使いやすい形に整える。

```typescript
// 主要な関数
getIndexPage(n)   // 記事一覧の n ページ目（{ page, pageCount, posts }）
getPost(permalink) // 記事1本のメタデータと本文（{ meta, body }）
```

- ソースは `public/content/pages/<n>.json` と `public/content/posts/<bodyId>.json`。書き出すのは `velite.config.ts` の `complete` フック（`lib/content/schema.ts` の `flushContent`）。`output.clean` がパース後・書き出し前に `.velite` を消すため、schema のパース中には書けない
- コンテンツは import せず fetch する。これが一番効いている設計判断で、理由は3段階ある:
  1. `posts.json` に本文を入れていた頃、エントリチャンクが全記事の本文（gzip 116KB）を抱えていた
  2. 本文を分離してメタデータだけ import しても、全ページが 22KB (gzip) の posts チャンクを読んでいた
  3. `import.meta.glob` に変えても、展開されたチャンク名（コンテンツハッシュ入り）がエントリチャンクに埋まるため、記事を1本直すたびに React と TanStack を含む 90KB (gzip) のバンドルのハッシュが変わっていた
  URL で取る限り、エントリチャンクはコンテンツの存在を知らない。CI の "Verify the entry chunk carries no content" がこれを固めている
- プリレンダーには fetch する先の HTTP サーバがないので、サーバ側は同じファイルをディスクから読む。分岐は `import.meta.env.SSR`（ビルド時にリテラルへ置換されるので、`node:fs` の import はクライアントバンドルから消える）
- プリレンダー済みページには本文が2回入る（描画済み DOM と、シリアライズされた loader ペイロード）。実測では記事1本が raw 11KB に対し gzip 3.7KB で、gzip が繰り返しを畳むため重複はほぼ効いていない。潰す価値はないと判断済み
- `public/content/` はビルド生成物。gitignore 済み
- frontmatter は Velite + Zod (`content/schema.ts`) でパースし、permalink / excerpt / thumbnail の正規化は `content/normalize.ts` の純関数が担う（`normalize.test.ts` で固めてある）。permalink は `/<slug>/`（前後スラッシュあり）に正規化済みなので、ルート・sitemap・feed はこの形を前提にしてよい
- thumbnail は本文 HTML の最初の `<img src="/images/posts/...">` から取る（og:image に使う。本文はメタデータと一緒に運ばれないので、ビルド時に抜いておく必要がある）

### `seo/artifacts.ts` - sitemap / feed
`vite.config.mts` の `seoArtifactsPlugin` が呼ぶ XML 生成。`lastmod` / `lastBuildDate` はビルド時刻ではなく記事の日付から導出する（ビルドのたびに全 URL が更新扱いになるのを避けるため）。`/profile/` は根拠のある日付がないので `lastmod` を出さない。`artifacts.test.ts` でエスケープと日付の扱いを固めている。

### `rehype-image.ts` - 画像の寸法と遅延読み込み
本文 `<img>` に実寸の `width` / `height` と `loading` / `decoding` を付ける rehype プラグイン。寸法は Velite の in-memory アセットマップ経由で元ファイルを sharp に読ませて取る（`output.clean` の後、`outputAssets` の前に走るので、出力ディレクトリを見てもファイルはまだない）。

### `pagination.ts` - ページ分割の算術
`POSTS_PER_PAGE` / `pageCount` / `pageSlice` / `pagePath` / `parsePageParam`。依存ゼロの純関数群で、`vite.config.mts` が config ロード時に import するため `.velite` の型すら参照してはいけない。ルート・プリレンダーの URL 列挙・コンテンツ層の slice が同じ算術を共有するための置き場所。

### `link-card.ts` - OGP リンクカード
本文中の裸 URL を OGP カードに変換する際の取得層。

- 成功した取得結果だけを `data/ogp-cache.json` に永続化し、失敗はメモリに留めて次回ビルドで再試行する（一時的な障害をリポジトリに焼き付けないため）
- 恒久的に取れない URL は `data/ogp-unfetchable.json` に手で記録する。ここに無いと「失敗を永続化しない」設計のせいで毎ビルド 10 秒のタイムアウトを賭け続けることになる（実際に 6 件がそうなっていた）
- キャッシュは 90 日で期限切れになり、ネットワークのあるビルドが取り直す（`fetchedAt` フィールド）。取り直しに失敗した場合は古いエントリを維持する。オフラインビルドは期限を無視してキャッシュをそのまま使う
- `OGP_OFFLINE=1` でネットワークを使わず fallback、`OGP_OFFLINE=strict` でキャッシュミス時にビルドを失敗させる。CI は strict

### `rehype-link-card.ts` - リンクカードへの置換
本文の中で「段落まるごとが1つの URL」になっているものだけをカードに置き換える rehype プラグイン。裸の URL と、テキストが href と同一のアンカーの両方を拾う。文中リンクや、テキストが href と違うアンカーには触れない。`rehype-link-card.test.ts` が判定条件を固めている。

### `ThemeContext.tsx` - Theme Context
`useTheme()` が `{ theme, toggleTheme }` を返す。`<html data-theme>` を直接書き換え、`localStorage` で永続化する。初期判定は `<html data-theme>`（`__root.tsx` の inline bootstrap script が先行設定）→ `localStorage["theme"]` → `prefers-color-scheme` の順。

見た目をテーマで出し分ける箇所は `theme` ではなく CSS 側（`[data-theme="dark"] .foo`）で書く。プリレンダーは light 固定で走るので、state から描くと dark の訪問者がハイドレーションまで反対の表示を見る。

## Data Flow

```
content/posts/[slug]/index.md
        ↓
    Velite build → public/content/{pages,posts}/*.json
        ↓
    getIndexPage / getPost (posts.ts, fetch)
        ↓
    app/routes/$.tsx (splat route, dangerouslySetInnerHTML)
```
