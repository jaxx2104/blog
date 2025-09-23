---
title: Macでllコマンドを使えるようにする
created_at: "2013-08-24T22:48:39+00:00"
updated_at: "2013-08-24T22:48:39+00:00"
path: /mac-ll-command
category: Terminal
tags:
  - Emacs
  - Mac
---

Linux でよく使うんですが、Mac は初期状態だと使えない。

なので.bahs_profile にエイリアスを設定します。

```
emacs .bash_profile
```

```
alias ll='ls -l'
```
