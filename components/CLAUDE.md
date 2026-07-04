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
└── icons/                 # Share buttons
```

## Subdirectories

### `features/`
機能固有のコンポーネント。他の機能との結合度が高い。

- **article/**: 記事表示関連 (`article.tsx`, `article-hero.tsx`, `article-tile.tsx`, `article-info.tsx`)
  - `article-hero.tsx` はトップの最新記事ヒーロー（細身セリフ大見出し + `ui/engraving` のバーストアート）
  - `article-tile.tsx` は共有罫線カタログのセル（hover はセル全体の色反転）
- **profile/**: プロフィールページ関連 (`profile-user.tsx`, `profile-work.tsx`, `profile-link.tsx`, `profile-others.tsx`, `thumbnail.tsx`)

### `layout/`
ページ全体のレイアウトを構成するコンポーネント。

- `layout.tsx` - メインレイアウト
- `navi.tsx` - マストヘッド（セリフキャップスのナビ + 中央ロゴ + POSTER/PAPER 反転ボタンを単体で内包）
- `footer.tsx` - フッター（エピグラフ + mono コロフォン）

### `ui/`
再利用可能な汎用 UI コンポーネント。機能に依存しない。

- `container.tsx`, `section.tsx` - レイアウトユーティリティ
- `heading.tsx`, `display.tsx`, `badge.tsx`, `time.tsx` - テキスト表示
- `tile-grid.tsx`, `slide-image.tsx` - グリッド・画像表示
- `engraving.tsx` - 銅版画風の放射線バースト SVG（決定論的に座標生成。prerender と hydration で同一マークアップになるよう `Math.random` / `Date` は使わない）

### `icons/`
- `icon-share.tsx` - シェアボタン（react-share の矩形テキストボタン。`resetButtonStyle={false}` でインラインスタイルを無効化して CSS Module で描画）

## Styling

- **CSS Modules** (`*.module.css`) で各コンポーネントのスタイルを管理
- 色・余白・フォントは `styles/tokens.css` の CSS variables のみ参照（デュオトーンの詳細は `styles/CLAUDE.md`）
- テーマ反転（POSTER/PAPER）は `<html data-theme>` で切替（`lib/ThemeContext.tsx` の `useTheme()` で API 提供）。反転面は `--color-main` × `--color-background` の組で書くと両モードで成立する
- 角丸・box-shadow・transform を使う hover は禁止。hover は色反転か下線のみ
- Boolean prop は `data-*` 属性 + CSS attribute selector で表現（例: `data-center` / `data-circle`）
