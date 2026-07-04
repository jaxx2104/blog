# Styles Directory

グローバルスタイルとテーマトークンを管理するディレクトリ。

## Design System

ピンク #e91e63 × 白 #ffffff の 2 色（デュオトーン）で全体を構成する。

- `data-theme="light"` = **POSTER**（ピンク地 × 白インク、デフォルト）
- `data-theme="dark"` = **PAPER**（白地 × ピンクインク）— ダークモードではなくデュオトーン反転
- 角丸なし（`--radius-*` は 0）、box-shadow なし。hover は色反転か下線のみ
- 見出し: `--font-family-display`（Bodoni Moda + Zen Old Mincho、uppercase + 字間広め）/ ラベル・メタ: `--font-family-mono`（Space Mono）/ 本文: `--font-family-base`（Zen Kaku Gothic New）

## Files

### `tokens.css` - Theme Tokens
CSS custom properties を `:root, [data-theme="light"]`（POSTER）と `[data-theme="dark"]`（PAPER）の 2 セットで定義する。コンポーネント側は `var(--color-main)` のように参照する。

- テーマで反転するトークン: `--color-background`（地）/ `--color-text`（インク）/ `--color-title` / `--color-main`（反転面: POSTER では白）/ `--color-sub` / `--color-border`（罫線）/ `--color-surface`
- **テーマ不変トークン**: `--color-brand` #e91e63 / `--color-brand-deep` #c2185b / `--color-paper` #fff。テーマに依らず固定したい面（記事プレート、コードブロック、header ボタン等）に使う
- mono ラベルの共通イディオム: `font-family: var(--font-family-mono); font-size: 0.6875rem; letter-spacing: var(--letter-spacing-label); text-transform: uppercase;`
- 罫線イディオム: 細罫 `1px solid var(--color-border)` / 二重罫 `4px double`（強い区切りは `6px double`）

### `global.css` - Global Styles
`body` / `a` / `main` / 記事本文 (`.content` 配下) をスタイリングする。記事 HTML は Velite が生成した `dangerouslySetInnerHTML` 由来の DOM のため、Module ではなくグローバル CSS として当てる必要がある。

- `.content` は**テーマ不変の白プレート**: `--color-paper` 地 + `--color-brand-deep` インク。内部の色は必ず不変トークン（brand / brand-deep / paper）で書く。テーマ反転トークンを使うと PAPER モードで破綻する
- 本文インクが #c2185b なのはコントラスト対策（白/#e91e63 は本文サイズで AA 未達、#c2185b on white = 5.87:1）
- `.content pre code` の `font-family: inherit` は modern-normalize の `code` 用フォントスタック上書き対策（外すと日本語コメントが tofu になる環境がある）
- コードブロックの配色は `lib/content/markdown.ts` のカスタム shiki テーマ（deep pink 地 + 白/ピンク tint 階調）が生成する
