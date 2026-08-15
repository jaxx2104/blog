# Styles Directory

`tokens.css` がテーマトークン（`:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セット）、`global.css` が base スタイルと記事本文。

## tokens.css

- `--color-main` はテーマごとのアクセント色（dark では明るいピンクに振る）。header などテーマに依らずブランドピンクで塗る面は `--color-brand` を使う
- `--color-title` は見出し・強調テキスト、`--color-surface` はカード内・inline code・blockquote などの面
- ページ地の `--color-page` はアクセントの `--color-brand` より一段暗い。同じ hue (oklch 16°) のまま明度だけ落としてある。ブランドピンクのままだと純白ですら 4.30 で、13px の二次テキストを AA に載せられない
- 文字色に `opacity` を重ねて二次トーンを作らない。下地が透けて実効コントラストが落ちる（pager の無効リンクが 1.37 まで落ちていた）。淡いトーンは `--color-on-page-dim` / `--color-muted` を使う
- 主要な組み合わせの比率は `styles/tokens.test.ts` が WCAG AA (4.5:1) で固めている。4.49 と 4.50 は目で見分けられないので、値をいじったらテストで確認する

## global.css

記事本文は Velite が生成した HTML を `dangerouslySetInnerHTML` で描くので、CSS Modules ではなく `.content` 配下のグローバルセレクタで当てる必要がある。欧文 2 書体の `@font-face` もここにある（self-host。日本語は容量が収まらず Google Fonts のまま `__root.tsx` が非同期に読む）。
