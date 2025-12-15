# Styles Directory

グローバルスタイルとテーマ設定を管理するディレクトリ。

## Files

### `theme.ts` - Theme Definition
ダーク/ライトモードのテーマ定義。

```typescript
// テーマ構造
{
  colors: {
    background: string
    text: string
    primary: string
    // ...
  },
  // その他のテーマ値
}
```

- `light` と `dark` の2つのテーマを定義
- `lib/ThemeContext.tsx` から使用

### `global-style.ts` - Global Styles
styled-components の `createGlobalStyle` でグローバルスタイルを定義。

- modern-normalize でブラウザスタイルをリセット
- 基本的なタイポグラフィ設定
- リンクスタイル
- コードブロックのスタイル

## Usage

```typescript
// Providers.tsx で適用
import { GlobalStyle } from '@/styles/global-style'
import { lightTheme, darkTheme } from '@/styles/theme'

<ThemeProvider theme={isDark ? darkTheme : lightTheme}>
  <GlobalStyle />
  {children}
</ThemeProvider>
```

## Dark Mode

1. `lib/useDarkMode.ts` でシステム設定を検出
2. `lib/ThemeContext.tsx` で状態管理
3. `styles/theme.ts` からテーマ値を取得
4. styled-components の `ThemeProvider` でコンポーネントに提供
