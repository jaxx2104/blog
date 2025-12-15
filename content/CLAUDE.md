# Content Directory

ブログ記事を Markdown 形式で管理するディレクトリ。

## Structure

```
content/posts/
└── [YYYY-MM-DD-slug]/
    ├── index.md      # 記事本文 (Markdown + frontmatter)
    └── *.jpg/png     # 記事内で使用する画像
```

## Frontmatter Schema

```yaml
---
title: "記事タイトル"
date: "YYYY-MM-DD"
path: "/path/to/post"
description: "記事の説明文"
category: "カテゴリ名"
tags:
  - tag1
  - tag2
---
```

### Required Fields
- `title`: 記事タイトル
- `date`: 公開日 (YYYY-MM-DD 形式)
- `path`: URL パス

### Optional Fields
- `description`: 記事の説明（OGP, メタタグ用）
- `category`: カテゴリ
- `tags`: タグの配列

## Images

- 記事と同じディレクトリに画像を配置
- Markdown で相対パスで参照: `![alt](./image.jpg)`
- ビルド時に base64 data URI に変換される

## Linting

```bash
pnpm lint:text      # textlint で日本語テキストをチェック
pnpm lint:textfix   # 自動修正
```

### textlint Rules
- `.textlintrc` で設定
- 日本語の技術文書向けルール
