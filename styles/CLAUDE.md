# Styles Directory

グローバルスタイルとテーマトークンを管理するディレクトリ。

## Files

### `tokens.css` - Theme Tokens
CSS custom properties (`--color-*` / `--font-size-*` / `--font-weight-*` / `--content-width` / `--line-height`) を `:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セットで定義する。コンポーネント側は `var(--color-main)` のように参照する。

### `global.css` - Global Styles
`body` / `a` / `ul, ol, li` / 記事本文 (`.content` 配下の `h1-h6` / `p` / `blockquote` / `img` / `pre` / `code` / `.link-card*`) をスタイリングする。記事 HTML は Velite が生成した `dangerouslySetInnerHTML` 由来の DOM のため、Module ではなくグローバル CSS として当てる必要がある。
