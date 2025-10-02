---
title: React.js製の静的サイトジェネレーターGatsbyに移行した
created_at: "2016-11-15T09:02:29+00:00"
updated_at: "2016-11-15T09:02:29+00:00"
guid: http://jaxx2104.info/?p=1404
path: /gatsby-theme
category: JavaScript
tags:
  - React.js
  - Gatsby
  - Static Site Generator
---

![](./reactjs.webp)

これまで WordPress で技術メモを書いていたのですが、
静的サイトジェネレータの記事を読んで試してみたいと思いました。
有名どころの jekyll, Hugo, Hexo などを一通り使ってみたのですが、
React.js 製の Gatsby がおもしろそうだなと思って WordPress 環境から移行してみました。

> gatsby
> https://github.com/gatsbyjs/gatsby

## Gatsby の特徴

- React.js ならではのリロードなドでのページ遷移
- サイト構築のためのコンポーネント・モデルが使える
- ライブで開発できる

<!--more-->

## 導入方法

Node.js と npm を事前にインストールしておきます。

インストール

```
npm install -g gatsby
```

プロジェクト作成

```
gatsby new blog https://github.com/gatsbyjs/gatsby-starter-blog
```

開発サーバ開始

```
cd blog
gatsby develop
```

localhost:8000 にアクセスするとページ確認できると思います。
ライブリロードが有効になっていてリアルタイムで変更が反映されます。

## 各ディレクトリの役割

テーマなどによって微妙に違うかもしれませんが理解している範囲で。

- `config.toml` 設定ファイル

- `/components` コンポーネントディレクトリ

- `_template.js` テンプレートファイル

- `index.js` インデックスファイル

- `/pages` データファイル（記事や固定ページ）

- `/wrappers` 記事や固定ページの wrapper?

- `/static` css や fonts

## WordPress から Gatsby に移行する

jekyll の移行ツールを使えば記事データをマークダウンにしてくれます。
その後で以下の２点を一括編集して。`/pages`に移しました。

- パーマリンクをパスに置換
- 画像ファイルパスの書き換え

> jekyll-import
> http://import.jekyllrb.com/

## GitHub Pages に公開する

### project page の場合

パスをそろえるため config.toml の linkPrefix にプロジェクト名を入れ、
GitHub にリモートリポジトリを設定し、

```
npm run deploy
```

すると`package.json`の

```
gatsby build --prefix-links && gh-pages -d public
```

が実行されて、gh-pages ブランチでサイトが更新されます。

### profile page の場合

自分は Netlify を使いこの方法で公開しました。
Netlify については以下の記事が詳しいです。

> 高機能ホスティングサービス Netlify について調べて使ってみた
> http://qiita.com/TakahiRoyte/items/b7c4d1581df1a17a93fb

使い方は Netlify にサインアップ後 GitHub とアカウント連携し今回のリポジトリを指定、
以下の設定で保存します。

- Branch: マスタ
- Build Cmd: gatsby build
- Public folder: public/

あとは管理画面上でカスタムドメインを設定し HTTPS を有効化したら完了。
マスタに push するとサイトが更新されます。

## 感想

費用的にはレンタルサーバ代の月１５００円分を節約できました。
カスタムドメインも使わなければ０円で運用できるのでよいですね。

機能的には React.js のコンポーネント設計によるテーマ作成のし易さと、
生成されたページがリロードなドでの遷移できるのがよいと思いました。
gatsby build は少し時間がかかるかなという感じ。

まだ技術的な情報が少ないので使う人が増えてくれるとよいなと思います。
あと今回スターターのテーマを参考に Bootstrap を使ったテーマを作ってみました。

> jaxx2104/gatstrap
> https://github.com/jaxx2104/gatstrap
