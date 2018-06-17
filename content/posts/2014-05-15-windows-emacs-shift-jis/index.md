---
title: windows版 emacsで日本語ディレクトリ内のファイルがおかしくなった時の対処方法
date: "2014-05-15T02:02:42+00:00"
author: jaxx2104
layout: post
path: /windows-emacs-shift-jis
category: Terminal
tags:
  - Emacs
  - init.el
  - Mac
---

Window マシンに Emacs を入れた際に、
日本語ディレクトリ内のファイルを開くと中身が空の状態になってしまいます。

## 原因は文字コードのせい

init.el もしくは.Emacs に以下の一文を追加してください。

```conf
(setq default-file-name-coding-system 'japanese-shift-jis)
```

これで問題なくファイルが開けるはずです。
