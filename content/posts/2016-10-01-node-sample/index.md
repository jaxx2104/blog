---
title: Gulp タスクランナーを使ったフロントエンド開発環境
date: "2016-10-01T09:02:29+00:00"
author: jaxx2104
layout: post
path: /node-sample
image: ./gulp.jpg
category: JavaScript
tags:
  - Node.js
  - Gulp
---

最近のフロントエンドはブラウザやライブラリ互換の問題を解決するため、
以前の書いた[記事](https://jaxx2104.info/bebel-es2015/)のように ES や SCSS をコンパイルして使うことが増えてきました。
ただ環境を用意するのにいろんなツールがあって気軽に ES や SCSS を使う人にはツラい。

という事で自分なりに必要最低限ツールをまとめたパッケージを作成しました。

> jaxx2104/gulp-sample
> https://github.com/jaxx2104/gulp-sample

## 主な機能

- ES と SCSS のライブコンパイル
- Node.js による Web サーバとライブリロード
- ファイル圧縮とソースマップ・ドキュメント生成
- Slack へのアラート

これらの設定は`gulpfile.js`に書いてます。

## 事前にインストール必要なツール

このツールは Node.js 上で動作します。公式から最新版をダウンロードしてください。

<!--more-->

## インストール

```sh
$ git clone git@github.com:jaxx2104/gulp-sample.git
$ npm run install
```

## 使い方

ライブコンパイルのスタート

```sh
$ gulp
```

ドキュメント生成

```sh
$ gulp doc
```

## アップデート

Node.js をアップデートする場合

```sh
$ sudo npm install -g n
$ sudo n latest
```

npm や gulp などのグローバルをアップデートする場合

```sh
$ sudo npm update -g npm
$ sudo npm update -g
$ sudo npm outdated -g
```

node_module 内のローカルをアップデートする場合

```sh
$ sudo npm update
$ sudo npm outdated
```

メジャーバージョンが違う場合は outdated で確認して、
package.json のバージョン指定を変更し再度 update してください。
