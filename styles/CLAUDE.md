# Styles Directory

`tokens.css` がテーマトークン（`:root, [data-theme="light"]` と `[data-theme="dark"]` の 2 セット）、`global.css` が base スタイルと記事本文。

## tokens.css

- `--color-main` はテーマごとのアクセント色（dark では明るいピンクに振る）。header などテーマに依らずブランドピンクで塗る面は `--color-brand` を使う
- `--color-title` は見出し・強調テキスト、`--color-surface` はカード内・inline code・blockquote などの面
- ページ地の `--color-page` はアクセントの `--color-brand` より一段暗い。同じ hue (oklch 16°) のまま明度だけ落としてある。ブランドピンクのままだと純白ですら 4.30 で、13px の二次テキストを AA に載せられない
- 文字色に `opacity` を重ねて二次トーンを作らない。下地が透けて実効コントラストが落ちる（pager の無効リンクが 1.37 まで落ちていた）。淡いトーンは `--color-on-page-dim` / `--color-muted` を使う
- 主要な組み合わせの比率は `styles/tokens.test.ts` が WCAG AA (4.5:1) で固めている。4.49 と 4.50 は目で見分けられないので、値をいじったらテストで確認する

## global.css

記事本文は Velite が生成した HTML を `dangerouslySetInnerHTML` で描くので、CSS Modules ではなく `.content` 配下のグローバルセレクタで当てる必要がある。

## web フォントは配信しない

`@font-face` は 1 つも無く、`tokens.css` のスタックは端末のインストール済みフォントで解決される。Playfair Display / Roboto Mono の self-host も、Noto Serif JP の Google Fonts 読み込みもやめた。戻す前に知っておくべきこと:

- 記事 1 ページの転送量は 1147KB → 134KB になった。差の大半は Noto Serif JP で、CSS 89KB（`@font-face` 372 個。実際に指している woff2 は 124 本しかなく、3 ウェイトぶんが同一 URL を重複参照していた）+ サブセット woff2 34 本 851KB
- 計測されたレイアウトシフトは全件が "Web font loaded" 由来だった。最近の記事で CLS 0.13（good の閾値 0.1 超え）が 0 になった。TBT 210ms → 0ms、LCP 2.7s → 1.8s
- 和文サブセットの自前配信も検討した。全 117 記事のユニーク文字は 1,415 種類しかなく可変フォント woff2 1 本 408KB に収まるが、それでも 136KB 構成には勝てない。やるなら `local()` を先に並べて、和文明朝を持たない端末だけが落とす形にする
- 端末側は macOS / iOS が Hiragino Mincho ProN、Windows が Yu Mincho に落ちる。Android は和文セリフを標準搭載していない可能性が高く、本文がゴシックになりうる。ここが全廃の唯一の代償
- `public/_headers` の `font-src 'none'` と `style-src` は現状に合わせて締めてある。`@font-face` を戻すなら両方を広げる必要がある
