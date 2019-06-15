---
title: emacsのinit.elが読み込めないときの対処方法
date: "2013-09-08T12:48:17+00:00"
author: jaxx2104
layout: post
path: /emacs-init-el-not
image: ./emacs_initel.jpg
description: 開発環境を移行したとき Emacs の設定ファイルの init.el が読み込めなくって、ちょっと困ったけどあっさり解決したので備忘録メモ。
category: Emacs
tags:
  - Emacs
  - init.el
  - Mac
---

.Emacs  と .Emacs.el が存在する場合は前者が優先的に読み込まれるので.Emacs を削除すればよい。

```
~/.emacs  <- こちらが優先的に読み込まれる
~/.emacs.d/init.el
```

これで読めました。

またほかの方法としては

.Emacs には  ~/.Emacs.d/init.el を読ませるだけで設定は init.el に書くっていうのもある。

```lisp
(load (expand-file-name (concat (getenv "HOME") "/.emacs.d/init")))
```

こっちのほうが運用しやすいのかも。
