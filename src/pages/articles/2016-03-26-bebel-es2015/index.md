---
id: 1348
title: Bebelを使ってJavaScriptをES2015で書く
date: "2016-03-26T19:53:32+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=1348
path: /bebel-es2015
image: /wp/images/2016/03/babel.png
categories:
  - JavaScript
  - node.js
---

<img src="./babel.png" alt="babel" />

## ES2015(ES6)について

去年 2015 年 6 月に JavaScript の標準仕様の ES2015 が正式にリリースされ、

自分も最近 ES2015 で書くことが多くなってきました。クラス定義やアロー関数、定数など非常に便利です。

詳細は以下の URL が分かりやすいです。

> ECMAScript 2015 Features
> <https://babeljs.io/docs/learn-es2015/>

<!--more-->

## Babel と Browserify について

ただ現在 ES2015 はブラウザによって対応がまちまちで、すべての機能が使えるわけではありません。

そこで JS トランスパイラすることでブラウザ間の依存を解消しようというのが Babel.js です。

また ES2015 はファイル分割による require 機能があります。

ですが abel 単体だとコンパイル時にファイルを結合できないため、Browserify というツールとその対応版 Babel の Babelify を使います。

> Babel
> <https://babeljs.io/>

> Browserify
> <http://browserify.org/>

## 実際に使ってみる

公式サイトのライブコーディングで試すことはできるのですが、せっかくなので自分の環境で用意したいと思います。

事前に Node.js と npm をインストールしている必要があります。

> node.js と npm インストールとアップデート
> <http://jaxx2104.info/node-js-install-update>

Browserify と Babelify をインストールします。

Babel は言語仕様を別途インストールする必要があります。ここでは ES2015。

```sh
$ npm install browserify -g
$ npm install babelify -g
$ npm install babel-preset-es2015 --save-dev
```

test.js というファイル名で ES2015 っぽいコードを書きます。

```js
var name = 'Bob',
  time = 'today'
var test = `Hello ${name}, how are you ${time}?`
console.log(test)
```

以下のコマンドをたたきます。

`$ browserify test.js -o bundle.js -t [ babelify --presets [ es2015 ] ]`

bundle.js というファイルでコンパイルされたでしょうか。

ES2015 でたくさんコードを書いていきましょう。

実際に使うときは更新の都度コンパイルするはツラいので gulp などのタスクランナーを使ってライブコンパイルしています。詳細はまた今度書きます。
