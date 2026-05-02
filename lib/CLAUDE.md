# Lib Directory

コアユーティリティとデータフェッチングロジックを管理するディレクトリ。

## Files

### `posts.ts` - Blog Post Data
ブログ記事の取得・処理を担当。

```typescript
// 主要な関数
getAllPosts()      // 全記事を日付降順で取得
getPostBySlug()    // スラッグから記事を取得
```

- `/content/posts/[slug]/index.md` から記事を読み込み
- gray-matter で frontmatter をパース
- 画像は Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL に書き出し（`velite.config.ts` の `assets` / `base` / `name` 設定）、本文 HTML 内ではそのまま参照

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
