# System Patterns

## Architecture Overview
- Gatsby による静的サイト生成
- React コンポーネントベースの設計
- GraphQL によるデータ取得
- Markdown ファイルをコンテンツソースとして使用

## Key Design Decisions
1. コンポーネント設計
   - Atomic Design に基づいたコンポーネント分割
   - 再利用可能な UI コンポーネントの作成
   - スタイルの管理に styled-components を採用

2. データ管理
   - Markdown ファイルを主要なデータソースとして使用
   - GraphQL によるデータ取得と変換
   - 記事のメタデータを frontmatter で管理

3. パフォーマンス最適化
   - コード分割によるバンドルサイズの最適化
   - 画像の最適化と遅延読み込み
   - プリフェッチによるページ遷移の高速化

## Component Structure
- Atoms: 基本的な UI 要素 (Button, Heading など)
- Molecules: 複数の Atom を組み合わせたコンポーネント
- Organisms: ページのセクションを構成する大きなコンポーネント
- Templates: ページレイアウトを定義するテンプレート

## Data Flow
1. Markdown ファイルの読み込み
2. GraphQL によるデータ取得
3. ページコンポーネントへのデータ注入
4. コンポーネントによるレンダリング
