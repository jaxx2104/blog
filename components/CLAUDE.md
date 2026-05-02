# Components Directory

React コンポーネントを機能別に整理したディレクトリ。

## Structure

```
components/
├── features/              # Feature-specific components
│   ├── article/           # Blog post display
│   └── profile/           # Profile page
├── layout/                # Layout components
├── ui/                    # Reusable UI components
└── icons/                 # Icon components
```

## Subdirectories

### `features/`
機能固有のコンポーネント。他の機能との結合度が高い。

- **article/**: 記事表示関連 (`article.tsx`, `article-tile.tsx`, `article-info.tsx`, `article-index.tsx`)
- **profile/**: プロフィールページ関連 (`profile-user.tsx`, `profile-work.tsx`, `profile-link.tsx`, `profile-others.tsx`, `thumbnail.tsx`)

### `layout/`
ページ全体のレイアウトを構成するコンポーネント。

- `layout.tsx` - メインレイアウト
- `navi.tsx`, `navi-logo.tsx`, `navi-menu.tsx` - ナビゲーション
- `footer.tsx` - フッター

### `ui/`
再利用可能な汎用 UI コンポーネント。機能に依存しない。

- `container.tsx`, `section.tsx`, `flex.tsx` - レイアウトユーティリティ
- `heading.tsx`, `badge.tsx`, `time.tsx` - テキスト表示
- `tile-grid.tsx`, `slide-image.tsx` - グリッド・画像表示
- `meta.tsx` - メタタグ
- `display.tsx`, `hr.tsx` - その他ユーティリティ

### `icons/`
FontAwesome ベースのアイコンコンポーネント。

- `icon.tsx` - 基本アイコン
- `icon-box.tsx` - ボックス付きアイコン
- `icon-share.tsx` - シェアアイコン

## Styling

- **CSS Modules** (`*.module.css`) で各コンポーネントのスタイルを管理
- 色・余白・フォントは `styles/tokens.css` の CSS variables (`var(--color-*)` / `var(--font-size-*)` / `var(--font-weight-*)` / `var(--content-width)`) のみ参照
- ダークモードは `<html data-theme="dark">` で切替（`lib/ThemeContext.tsx` の `useTheme()` で API 提供）
- Boolean prop は `data-*` 属性 + CSS attribute selector で表現（例: `data-primary` / `data-center` / `data-variant`）
- 数値で動的に変わる値（size 等）は CSS variable 経由で `style={{ "--icon-size": "..." }}` として渡す
