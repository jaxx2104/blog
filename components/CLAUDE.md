# Components Directory

`features/`（機能固有）、`layout/`（ページの骨格）、`ui/`（機能に依存しない汎用）、`icons/` の 4 つに分ける。

## Conventions

- CSS Modules (`*.module.css`) をコンポーネントの隣に置く
- 色・余白・フォントは `styles/tokens.css` の CSS variables 経由でのみ参照する（生の値を書かない）
- boolean prop は `data-*` 属性 + CSS attribute selector で表す（`data-primary` / `data-center` / `data-variant`）
- 数値で動的に変わる値は CSS variable で渡す（`style={{ "--icon-size": "..." }}`）
- テーマによる出し分けは `:global([data-theme="dark"]) .foo` と CSS 側で書く。React state から描くと、light 固定で走るプリレンダーの出力が dark の訪問者にとって誤りになる
- URL の組み立てはコンポーネントに持たせない（`ui/pager.tsx` は `hrefFor` を prop で受ける）

## Testing

spec はコンポーネントの隣に `*.test.tsx` として置き、先頭に `@vitest-environment jsdom` の docblock を書く（`vitest.config.ts` の既定は node で、純関数の spec を jsdom で走らせないため）。`@/lib/router-link` はルーターの context を要求するので `vi.mock` で素の `<a>` に差し替える。`layout/navi-menu.test.tsx` と `ui/pager.test.tsx` が手本。

## Notes

`layout/navi-menu.tsx` の item はリンク (`{ text, to }`) かボタン (`{ label, action }`) の判別ユニオン。ボタンは `<button type="button">` + `aria-label` でテキストを持たず、グリフは CSS が `[data-theme]` を見て出す。以前は `<p onClick>` だったため、キーボードからもスクリーンリーダーからも操作できなかった。
