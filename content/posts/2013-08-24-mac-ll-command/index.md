---
title: Macでllコマンドを使えるようにする
date: "2013-08-24T22:48:39+00:00"
author: jaxx2104
layout: post
path: /mac-ll-command
category: Terminal
tags:
  - Emacs
  - Mac
---

Linux でよく使うんですが、Mac は初期状態だと使えない。

なので.bahs_profile にエイリアスを設定します。

```sh
emacs .bash_profile
```

```sh
alias ll='ls -l'
```
