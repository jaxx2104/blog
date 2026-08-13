# Lib Directory

コアユーティリティとデータフェッチングロジックを管理するディレクトリ。

## Files

### `posts.ts` - Blog Post Data
Velite の出力（`.velite/`）をラップして、ルートから使いやすい形に整える。

```typescript
// 主要な関数
getAllPosts()           // 全記事のメタデータを日付降順で PostMeta[] として返す
getPostByPermalink()    // permalink からメタデータを引く（本文は含まない）
getPostBody(bodyId)     // 記事本文 HTML を非同期で取る（記事ごとの別チャンク）
```

- メタデータのソースは `.velite/posts.json`、本文は `.velite/bodies/<bodyId>.json`
- 本文を分離しているのはバンドルサイズのため。posts.json に本文を含めていた頃はエントリチャンクが全記事の本文（gzip 116KB）を抱えていた。`getPostBody` は `import.meta.glob` の遅延ローダーなので、記事1本ぶんだけが読み込まれる
- 本文ファイルを書き出すのは `velite.config.ts` の `complete` フック。`output.clean` がパース後・書き出し前に `.velite` を消すため、schema のパース中には書けない（`lib/content/schema.ts` の `flushBodies` 参照）
- プリレンダー済みページには本文が2回入る（描画済み DOM と、シリアライズされた loader ペイロード）。実測では記事1本が raw 11KB に対し gzip 3.7KB で、gzip が繰り返しを畳むため重複はほぼ効いていない。潰す価値はないと判断済み
- frontmatter は Velite + Zod (`lib/content/schema.ts`) でパース済み。permalink / excerpt / thumbnail の正規化は `lib/content/normalize.ts` の純関数に切り出してあり、`normalize.test.ts` で固めている
- permalink は `/<slug>/`（前後スラッシュあり）に正規化済み。ルート・sitemap・feed はこの形を前提にしてよい
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照
- thumbnail は本文 HTML から最初の `<img src="/images/posts/...">` を抽出して `PostMeta.thumbnail` に詰める

### `seo/artifacts.ts` - sitemap / feed
`vite.config.mts` の `seoArtifactsPlugin` が呼ぶ XML 生成。`lastmod` / `lastBuildDate` はビルド時刻ではなく記事の日付から導出する（ビルドのたびに全 URL が更新扱いになるのを避けるため）。`/profile/` は根拠のある日付がないので `lastmod` を出さない。`artifacts.test.ts` でエスケープと日付の扱いを固めている。

### `rehype-image.ts` - 画像の寸法と遅延読み込み
本文 `<img>` に実寸の `width` / `height` と `loading` / `decoding` を付ける rehype プラグイン。寸法は Velite の in-memory アセットマップ経由で元ファイルを sharp に読ませて取る（`output.clean` の後、`outputAssets` の前に走るので、出力ディレクトリを見てもファイルはまだない）。

### `link-card.ts` - OGP リンクカード
本文中の裸 URL を OGP カードに変換する際の取得層。成功した取得結果だけを `data/ogp-cache.json` に永続化し、失敗はメモリに留めて次回ビルドで再試行する（一時的な障害をリポジトリに焼き付けないため）。`OGP_OFFLINE=1` でネットワークを使わず fallback、`OGP_OFFLINE=strict` でキャッシュミス時にビルドを失敗させる。

### `ThemeContext.tsx` - Theme Context
ダーク/ライトモードのテーマ管理。`<html data-theme="...">` 属性を直接書き換え、`localStorage` で永続化する。

```typescript
const { theme, toggleTheme } = useTheme()
```

- 初期判定: (1) `<html data-theme>` （`__root.tsx` の inline bootstrap script で先行設定）→ (2) `localStorage["theme"]` → (3) `prefers-color-scheme` の順
- 切替時: state 更新 + `document.documentElement.dataset.theme` 書き換え + `localStorage` 書き込み

## Data Flow

```
content/posts/[slug]/index.md
        ↓
    Velite build (.velite/ generated)
        ↓
    getAllPosts / getPostByPermalink (posts.ts)
        ↓
    app/routes/$.tsx (splat route, dangerouslySetInnerHTML)
```
