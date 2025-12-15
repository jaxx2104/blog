# App Directory

Next.js 15 App Router のページとレイアウトを管理するディレクトリ。

## Structure

```
app/
├── layout.tsx        # Root layout (フォント設定, Providers)
├── page.tsx          # Homepage (ブログ記事一覧)
├── [...slug]/
│   └── page.tsx      # Dynamic route for blog posts (MDX rendering)
└── profile/
    └── page.tsx      # Profile page
```

## Key Patterns

### Static Site Generation
- `output: 'export'` で静的サイトとしてビルド
- `trailingSlash: true` で末尾スラッシュを付与
- `generateStaticParams` で動的ルートを事前生成

### Root Layout (`layout.tsx`)
- Noto Sans JP フォントの設定
- `Providers` コンポーネントでテーマとstyled-componentsレジストリをラップ
- メタデータの設定

### Blog Post Route (`[...slug]/page.tsx`)
- Catch-all route でネストされたパスに対応
- `lib/posts.ts` からデータ取得
- MDX を `@next/mdx` でレンダリング
- rehype-pretty-code でシンタックスハイライト

## Notes

- 画像は `next/image` を使用するが、静的エクスポートのため `unoptimized: true`
- ビルドエラーは一時的に `ignoreBuildErrors: true` で無視（マイグレーション中）
