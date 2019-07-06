---
title: "Vue.js Tokyo v-meetup #8 に行ってきた"
date: "2018-08-29T00:00:00+00:00"
author: jaxx2104
layout: post
path: /v-meetup8
image: "image.jpg"
description: ブログ書く枠で参加させていただいたのでレポート👨‍💻
category: メモ
tags:
  - Vue.js
  - Netlify
---

- Connpass [Vue.js Tokyo v-meetup #8](https://vuejs-meetup.connpass.com/event/95678/)
- ハッシュタグ [#vuejs_meetup8](https://twitter.com/hashtag/vuejs_meetup8)

## Vue Fes Japan 2018 に向けたお知らせ

[@kazu_pon](https://twitter.com/kazu_pon) さん

- 9 月 10 日チケット販売開始
- 販売開始前に事前にメールで連絡あるので事前登録おすすめ
- 販売数 360 枚（先着）
- ボランティアスタッフ募集中

**スピーカーとタイトルが発表 🎉**

- 海外スピーカー と CFP

**One More Thing 🎉**

- Reject Conference 開催決定！
- 2018/11/10 を予定しているとのこと

<!--more-->

## dev.to そして、阿部寛のホームページを超えろ！Vue Fes サイト高速化

[@inouetakuya](https://twitter.com/inouetakuya) さん

[Vue Fes Japan](https://vuefes.jp/)の話

**サイトの特徴**

- ヘッド画像 + 画像 60 枚
- 静的サイトジェネレーター

**速度目標の立て方**

- ビジネスゴールから考える
- First Meaningful Paint に着目
- Vue.js のブランディングにつながる

**_「dev.to と 阿部寛の HP の First Meaningful Paint を超えるサイトにしよう!!」_**

**改善内容**

- 改善箇所を見失わないために超速本のクリティカルレンダリングパスを意識する
- 効果測定して効果がないものは削除した

**効果があったものを紹介**

- 画像の最適化 (webp, png -> jpeg, resize, imagemin, vue-lazyload)
- フォントの遅延読み込み (preload)
- HTTP/2, CDN (Netlify)

**改善結果**

- Vue Fes 1653ms -> 862ms 🎉
- dev.to 1332ms
- 阿部寛の HP 600ms

**_「dev.to には勝った！ 阿部寛の HP 強し。。」_**

## Vue 未経験者が Vue+Atomic Design でサイトリニューアルした話

[@kamepon_fe](https://twitter.com/kamepon_fe)

Qiita で記事がバズった！

> [Vue CLI UI が想像以上に便利だった話](https://qiita.com/isihigameKoudai/items/eee3eb6a435675fdfd73)

**構成**

- Vue.js + Vuex
- webpack 3
- ESlint + Prettier

**_「既存のマークアップを Organisms ごとに切る」_**

**Vue.js 使ってみて**

- 宣言的、リアクティブ
- 単一ファイルコンポーネント便利
- style scoped で class の命名で消耗しない
- なんとなく書いても動くので中規模だと設計大事
- 書いてて楽しい

**Atomic Design 使ってみて**

- Atoms 初期段階で手を出すと辛い
- Organisms をタスクベースで考える
- ファイルの見通しがとても楽

**まとめ**

UI に着目するのではなく「機能」に着目して UI を作る

## デザインツールをつくりなおす話

[@keimakai1993](https://twitter.com/keimakai1993)

[STUDIO](https://studio.design/ja)の話

**前回発表をした 1 年前に比べて**

- フロントエンドエンジニアが増えた
- デザインツールをつくりなおすことになった

**具体的な機能についての紹介**

- コンポーネント機能
  - Vue.js のコンポーネントの概念に着目して STUDIO にもコンポーネント機能ができた
- 3 代目ドラッグ&ドロップ
  - 設計がイケてなかったので開発中
  - Flexbox のツラみ

## ありがとうあの時 Vue.js は僕を助けた

[@mtmtkzm](https://twitter.com/mtmtkzm)

**受託開発の特徴**

- ひとつひとつのスパンが短め
- 数をこなせる
- いろんなデザインを見れる

**フロントエンドの激流時代**

- 徐々に状況がわからなくなってきた
- 作るものが違うから技術が違って当然
- 楽しい Web 開発とは
- 焦燥感

**Vue.js 　が助けてくれた**

- ドキュメントが楽しい
- Slack vuejs-jp のコミュニティが優しい

**結果**

- [ポートフォリオ](https://mtmtkzm.com/) や [フォトギャラリー](https://maner.gallery/)を作った
- マークアップエンジニアからフロントエンドエンジニアに
- いまでは Laravel + Vue.js プロジェクトの開発運用

## vue.js xss vulnerability and ssr/spa rendering architecture

[@aintek4](https://twitter.com/aintek4)

- XSS が発生する仕組み
- SSR/SPA レンダリングで解説

**デモと解説**

- タグ文字列を含む任意の値を属性値として使っている場合に、SSR 時にその属性値がタグとして出力されてしまう問題

途中で時間切れだったので残念
スライドの図がわかりやすかったので資料待ち

## Replace View of Backbone.js with Vue.js

[@\_tanakaworld](https://twitter.com/_tanakaworld)

- [proff](https://jp.techcrunch.com/2018/08/20/proff-launched/)というサービスをローンチしました

Backbone.js SPA をリプレイスした話

**UI リニューアル**

- 大幅リニューアル（複雑な UI）
- Backbone.js で実装できる自信ない
- Vue.js の採用

**Backbone.js との共存**

- Backbone.js に Vue コンポーネントを渡す
- Backbone.js のモデルを Vuex に渡す
- jQuery ライブラリと Vue の連携（\$ref）

**_「リプレイスというよりは使える資産はそのまま追加スタックによる移行」_**

**リリースした結果**

- 既存ライブラリに干渉しなかったことで影響範囲小さく進められる
- UI パーツのコンポーネント化できたので効率化アップ

**注意点**

- バンドルサイズは大きくなってしまった
- jQuery と Vue.js ライフサイクルは共存できない
- 境界線は明確にしないとカオスになる

## 感想

- 速度改善は全体の進捗が把握しづらいの超わかるので、クリティカルレンダリングパスを意識しようと思った。
- Atomic Design は複数人で開発する上でマストだと思った、初動コストについて考えると導入初期は設計というよりはゆるい方針くらいで良いのかなと思った。
- 大幅リニューアルでレガシーコードをフルリプレイスとせずに既存の資産を活かしつつ移行している話ツラそうだったけど、中〜大規模なプロダクトにおけるフロントエンドの開発スタンスや移行方法は参考になった。
- 回数を重ねるごとに規模が大きくなっているけどテンポよい進行。参加者も幅広いし、初心者 LT 枠もあって雰囲気よかった
