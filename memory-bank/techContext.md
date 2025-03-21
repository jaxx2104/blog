# Tech Context

## Core Technologies
- Gatsby (v4+)
- React (v17+)
- TypeScript (v4+)
- GraphQL
- styled-components

## Development Tools
- Node.js (バージョンは .node-version で管理)
- pnpm パッケージマネージャ
- ESLint + Prettier によるコードフォーマット
- TypeScript 型チェック
- Gatsby CLI による開発サーバー

## Build Process
1. 依存関係のインストール: `pnpm install`
2. 開発サーバーの起動: `pnpm dev`
3. プロダクションビルド: `pnpm build`
4. ローカルでのプロダクション確認: `pnpm serve`

## Testing Strategy
- 現在はユニットテストやE2Eテストは導入されていない
- 手動でのブラウザテストが主な検証方法
- 将来的に Jest + Testing Library の導入を検討

## Deployment
- 静的ファイルのデプロイ
- Netlify や Vercel などのプラットフォームに対応
- CI/CD パイプラインの設定可能

## Code Quality
- TypeScript による型安全性の確保
- ESLint によるコード品質チェック
- Prettier によるコードフォーマットの統一
- Git フックによる自動フォーマット
