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
- Markdown で相対パスで参照: `![alt](./image.webp)`
- ビルド時に Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL にコピーし、本文 HTML 内ではそのまま参照される（`velite.config.ts` の `assets` / `base` / `name` 設定）
- `public/images/posts/` は生成物（gitignore 済み）。`velite.config.ts` の `complete` フックがビルドのたびに、そのビルドで出力しなかったファイルを削除する。Velite の `output.clean` は data ディレクトリしか掃除しないため、これがないと画像を再エンコードするたびに古いハッシュのファイルが残り続ける
- 画像は追加時に `pnpm optimize:images` を通す（`--dry-run` で結果だけ確認できる）。長辺 1600px にリサイズし、得になる場合だけ WebP に変換して `index.md` の参照も書き換える。写真・スクリーンショット・アニメーションで品質設定を変えている（`scripts/optimize-images.ts`）
- 本文 HTML の `<img>` には `lib/rehype-image.ts` が実寸の `width` / `height` と `loading` / `decoding` を付ける。先頭付近の1枚だけ `loading="eager"` + `fetchpriority="high"` になる。記事側で `width` などを手書きしている場合はそちらが優先される
- Scrapbox から取り込んだ記事に、リポジトリ内にローカルコピーがありながら本文はリモート URL を参照したままの画像が 17 枚（約 1.28MB）ある。ローカル参照に向ければ残りの CLS が消えて記事も軽くなるが、Amazon の商品画像や他ブログの図版を自前でホストし直すことになるため、そうしないと 2026-08-14 に決めた。蒸し返さない

## Linting

```bash
pnpm lint:text      # textlint で日本語テキストをチェック
pnpm lint:textfix   # 自動修正
```

### textlint Rules
- `.textlintrc` で設定
- 日本語の技術文書向けルール
- CI（Lint workflow）で `pnpm lint:text` が走る。以前は Biome しか回っておらず、13記事に 161 件の違反が溜まっていた
- `ja-space-around-link` だけ無効にしている。日本語文中のリンク前後のスペースを削るルールだが、リンク記法と裸の URL を区別しないため、`Docker 入れる https://...` のような行が `入れるhttps://...` になって読めなくなる。リンク記法のスペースは著者の判断に委ねる
- `ai-writing` の指摘は info であり error ではないので CI は落ちない。文章の改善提案として読む
