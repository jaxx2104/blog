---
id: 814
title: Titanium 3.2 で Genymotion を使って 遅いAndroid エミュレータから解放される
date: "2013-12-20T00:51:34+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=814
path: /titanium-3-2-genymotion
dsq_thread_id:
  - "2061105363"
categories:
  - Android
  - Titanium
tags:
  - Android
  - Genymotion
  - Titanium
---
## Androidエミュレータ = 重い

立ち上がりまでが重いですよね。

開発していてログとか取るのも一苦労です。

## Titanium + Genymotion

最近は仮想マシンとして Android エミュレータを立ち上げる Genymotion を使うのが主流みたいで、
Titanium も使えないかなと思ったら、バージョン 3.2 から対応したみたいです。

さっそく有効にしてみたいと思う。

<!--more-->

環境

- macOS 10.9.1
- Titanium SDK 3.2
- Titanium CLI 3.2
- Titanium Studio 3.2
- Alloy 1.3

Genymotion インストール済

Genymotion は公式のスタートガイドに習いながらエミュレータ起動まで確認しました。

Titanium cli の config で Genymotion を有効にします。

```sh
$ titanium config genymotion.enabled true
```

そうすると titanium studio 上で「Android Emulator」の中に Genymotion のエミュレータが追加されると思います。ログも出せるので開発はかどるよ！
