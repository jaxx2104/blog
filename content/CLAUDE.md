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
created_at: 'YYYY-MM-DDTHH:mm:ss.000Z'
updated_at: 'YYYY-MM-DDTHH:mm:ss.000Z'
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
- `created_at`: 作成日時 (ISO 8601 形式、例: `'2025-12-15T00:00:00.000Z'`)
- `updated_at`: 更新日時 (ISO 8601 形式)
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

## Writing Style Guide

著者の文体を踏襲するためのガイドライン。

### 一人称・語り口

- 一人称は「自分」を使用
- 読者に語りかける親しみやすいトーン
- 断定を避け「〜と思います」「〜かなと」で柔らかく表現

### 導入部

- 背景や動機から始める
  - 「〜ということで、〜してみました。」
  - 「〜に興味があって〜」
- 季節や状況に触れることもある
  - 「暑い季節になってきました。」

### 本文

- 主観を交えつつ実用的な情報を伝える
  - 「個人的には〜が好みです」
  - 「〜がおすすめです」
  - 「〜と良いと思います」
- カジュアルな表現を適度に使用
  - 「いい感じです」「〜もチェックすると良いと思います」
- 謙虚な姿勢を示す
  - 「誤りがあった場合は優しく指摘してもらえればと思います」

### 締めくくり

- 簡潔に終える
  - 「以上です。」「以上。」「終わり。」
- 読者へのアクションを促すことも
  - 「興味がある人は実際に〜してみてはどうでしょうか。」

### 記事構成

**技術記事**
1. 導入（動機・背景）
2. 概要
3. 手順説明（見出しで区切り、箇条書きやコード例を活用）
4. まとめ

**レビュー記事**
1. 製品名（見出し）
2. 一言感想
3. 詳細説明（スペック、使用感）
4. リンク

### 絵文字

- 控えめに使用（1 記事に 0〜2 個程度）
- 感情を補足する場面で: 🙏 👶 🙋
