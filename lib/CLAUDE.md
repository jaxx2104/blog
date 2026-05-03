# Lib Directory

コアユーティリティとデータフェッチングロジックを管理するディレクトリ。

## Files

### `posts.ts` - Blog Post Data
Velite の出力（`.velite/posts.ts`）をラップして、ルートから使いやすい形に整える。

```typescript
// 主要な関数
getAllPosts()           // 全記事を日付降順で PostMeta[] として返す
getPostByPermalink()    // permalink から記事本文付き PostFull を引く
getAllPermalinks()      // 日付降順の permalink 一覧（prerender 用）
```

- `.velite/posts.ts` をソース（`getAllPosts` / `getPostByPermalink` / `getAllPermalinks`）にしている
- frontmatter は Velite + Zod (`lib/content/schema.ts`) でパース済み
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照
- thumbnail は本文 HTML から最初の `<img src="/images/posts/...">` を抽出して `PostMeta.thumbnail` に詰める

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
