# Skill: write-blog-post

ブログ記事を新規作成し、テキスト校正まで行うスキル。

## Usage

```
/write-blog-post <トピック or タイトル>
```

引数にトピックやタイトルを指定する。省略した場合はユーザーに確認する。

## Instructions

### 1. 記事情報の決定

ユーザーの指定したトピックをもとに、以下を決定する：

- **title**: 記事タイトル（日本語）
- **slug**: URL用のスラッグ（英語、ケバブケース）
- **category**: カテゴリ名
- **tags**: 関連タグの配列
- **description**: 記事の説明文（OGP用、1-2文）

決定した内容をユーザーに提示し、確認を取ってから次に進む。

### 2. 記事ファイルの作成

以下の規約に従ってファイルを作成する：

- **ディレクトリ**: `content/posts/YYYY-MM-DD-<slug>/`（日付は今日の日付）
- **ファイル**: `index.md`
- **日時**: `created_at` と `updated_at` は現在日時（ISO 8601形式、例: `2026-03-15T00:00:00.000Z`）
- **path**: `/<slug>` 形式

Frontmatter テンプレート：

```yaml
---
title: "タイトル"
created_at: "YYYY-MM-DDTHH:mm:ss.000Z"
updated_at: "YYYY-MM-DDTHH:mm:ss.000Z"
path: "/slug"
description: "説明文"
category: "カテゴリ"
tags:
  - tag1
  - tag2
---
```

### 3. 記事本文の執筆

- 日本語の技術ブログ記事として執筆する
- 読者は日本語話者のエンジニアを想定
- 見出し（##, ###）で構造化する
- コード例がある場合はシンタックスハイライト用に言語を指定する（```js, ```ts など）
- 簡潔で読みやすい文体にする
- 画像を使う場合は同じディレクトリに配置し `![alt](./filename.jpg)` で参照する

### 4. テキスト校正

記事を書き終えたら以下を実行する：

```bash
pnpm lint:text
```

エラーがあれば内容を確認し、自動修正を試みる：

```bash
pnpm lint:textfix
```

自動修正後もエラーが残る場合は手動で修正する。最終的に `pnpm lint:text` がエラーなしで通ることを確認する。

### 5. 完了報告

以下の情報をユーザーに報告する：

- 作成したファイルのパス
- 記事のURL path
- lint の結果（pass/fail）
- 記事の概要
