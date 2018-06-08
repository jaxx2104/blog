---
id: 1404
title: JavaScript で Arrow 関数を使った時の this の代わり
date: "2016-12-11T17:15:00+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=1404
path: /arrow-function
image:
categories:
  - JavaScript
tags:
  - ES
---

これまでイベント関数でバインドした要素を取得する場合。

```js
$('.button').on('click', function(e) {
  $(this).addClass('clicked')
})
```

こんなコードを書いてました。

## Arrow 関数の場合

`e.target`だとクリックした要素を取得するので`.button`の子要素の場合があります。

```js
$('.button').on('click', e => {
  $(e.target).addClass('clicked')
})
```

`e.currentTarget`だとバインドした要素を取得します。

```js
$('.button').on('click', e => {
  $(e.currentTarget).addClass('clicked')
})
```
