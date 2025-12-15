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
- 画像は base64 data URI に変換（`image-utils.ts` 使用）

### `image-utils.ts` - Image Processing
記事内の画像を base64 data URI に変換。

- 静的エクスポート互換性のため
- ローカル画像パスを検出して変換

### `ThemeContext.tsx` - Theme Context
ダーク/ライトモードのテーマ管理。

```typescript
// 使用方法
const { theme, toggleTheme } = useTheme()
```

### `useDarkMode.ts` - Dark Mode Hook
システム設定とローカルストレージからダークモード状態を管理。

### `registry.tsx` - styled-components SSR
styled-components の SSR サポート用レジストリ。

### `storage.ts` - Local Storage
localforage を使用したストレージユーティリティ。

## Data Flow

```
content/posts/[slug]/index.md
        ↓
    posts.ts (getAllPosts / getPostBySlug)
        ↓
    image-utils.ts (base64 conversion)
        ↓
    app/[...slug]/page.tsx (MDX rendering)
```
