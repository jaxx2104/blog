---
title: TitaniumでデバイスのOSバージョンの取得
date: "2013-11-21T02:48:24+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=715
path: /titanium-get-device-os-version
image: ./f19313ab36c560af5c9a4d02c866846d.jpg
description: アプリケーションを iOS 7 のデザインへ対応するとき新しいナビゲーション部分に回りこんでしまうため、iOS 7 のみで分岐が必要になってきます。
category: JavaScript
tags:
  - iOS7
  - Ti.Platform.version
  - Titanium
---

<small>正直この分岐は納得いかない。</small>

<!--more-->

## Ti.Platform.version を使う

メジャーバージョンのみを見るので小数点以下は切り捨てます。

```js
var version = Math.floor(Ti.Platform.version)
```

あとバージョンに負の数はあたらないだろうから下でも動く。

```js
var version = ~~Ti.Platform.version
```

むしろこっちのほうが速い。

ただ 0 以上 2147483648 未満の少数でなくてはいけない。

iOS 2147483648 になるのはいつなのか気になるけども、そのころには端末も義眼とかなんですかね？　なんなんですかね？

## iOS 7 で分岐させる例

```js
var version = ~~Ti.Platform.version
if (OS_IOS && version >= 7) {
  $.window.setTop(64)
}
```

こういう感じで使う。
