# Styles Directory

グローバルスタイルとテーマトークンを管理するディレクトリ。

## Files

### `tokens.css` - Theme Tokens
CSS custom properties (`--color-*` / `--font-size-*` / `--font-weight-*` / `--content-width` / `--content-width-narrow` / `--line-height*` / `--radius-*`) を `:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セットで定義する。コンポーネント側は `var(--color-main)` のように参照する。

- `--color-main` はテーマごとのアクセント色（dark では明るいピンクに振る）。header などテーマに依らずブランドピンクで塗る面は `--color-brand` を使う
- `--color-title` は見出し・強調テキスト、`--color-surface` はカード内・inline code・blockquote などの面に使う

### `global.css` - Global Styles
`body` / `a` / `ul, ol, li` / 記事本文 (`.content` 配下の `h1-h6` / `p` / `blockquote` / `img` / `pre` / `code` / `.link-card*`) をスタイリングする。記事 HTML は Velite が生成した `dangerouslySetInnerHTML` 由来の DOM のため、Module ではなくグローバル CSS として当てる必要がある。
