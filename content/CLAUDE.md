# Content Directory

記事は `content/posts/<YYYY-MM-DD-slug>/index.md`、画像は同じディレクトリに置いて相対パスで参照する。frontmatter の書き方は README の "Writing a Post"、受け付けるフィールドの定義は `lib/content/schema.ts`（スキーマに無いキーは黙って捨てられるので、書いても効かない）。

## Images

- Markdown からは相対パスで参照する: `![alt](./image.webp)`
- ビルド時に Velite が `public/images/posts/<name>-<hash>.<ext>` のフラット URL にコピーする（`velite.config.ts` の `assets` / `base` / `name`）
- `public/images/posts/` は生成物（gitignore 済み）。`velite.config.ts` の `complete` フックが、そのビルドで出力しなかったファイルを毎回削除する。Velite の `output.clean` は data ディレクトリしか掃除しないため、これがないと画像を再エンコードするたびに古いハッシュのファイルが残り続ける（88 枚の参照に対して 172 ファイルまで増えていた）
- 画像は追加時に `pnpm optimize:images` を通す（`--dry-run` で結果だけ確認できる）。長辺 1600px にリサイズし、得になる場合だけ WebP に変換して `index.md` の参照も書き換える。写真・スクリーンショット・アニメーションで品質設定を変えている（`scripts/optimize-images.ts`）
- 本文の `<img>` には `lib/rehype-image.ts` が実寸の `width` / `height` と `loading` / `decoding` を付ける。先頭付近の1枚だけ `loading="eager"` + `fetchpriority="high"` になる。記事側で `width` などを手書きしている場合はそちらが優先される
- Scrapbox から取り込んだ記事に、リポジトリ内にローカルコピーがありながら本文はリモート URL を参照したままの画像が 17 枚（約 1.28MB）ある。ローカル参照に向ければ残りの CLS が消えて記事も軽くなるが、Amazon の商品画像や他ブログの図版を自前でホストし直すことになるため、そうしないと 2026-08-14 に決めた。蒸し返さない

## Linting

`pnpm lint:text` / `pnpm lint:textfix`。CI の Lint workflow でも走る（以前は Biome しか回っておらず、13 記事に 161 件の違反が溜まっていた）。

- `ja-space-around-link` だけ無効にしている。日本語文中のリンク前後のスペースを削るルールだが、リンク記法と裸の URL を区別しないため、`Docker 入れる https://...` のような行が `入れるhttps://...` になって読めなくなる。リンク記法まわりのスペースは著者の判断に委ねる
- `ai-writing` の指摘は info であって error ではないので CI は落ちない。文章の改善提案として読む
