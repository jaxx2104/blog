---
title: MacのターミナルのプロンプトをLinuxっぽく変える
date: "2013-11-11T00:13:03+00:00"
author: jaxx2104
layout: post
path: /mac-terminal-prompt-linux-like
category: Terminal
tags:
  - .bash_profile
  - Emacs
  - Mac
  - Terminal
  - ターミナル
  - プロンプト
---

初期状態だとこんな感じ

```sh
iMac:~ jaxx2104$
```

## 変更

このサイトでどんな表示になるのかを確認しながら変更できる。

> Bash $PS1 Generator
> http://www.kirsle.net/wizards/ps1.html

出力結果を.bash_profile に書けばよいだけ

```sh
emacs .bash_profile
```

自分はこう書いてます。

```sh
export PS1="[\u@\h \W]\\$ "
```

## 反映

```sh
sourse .bash_profile
```

するとこんな感じになる。

```sh
[jaxx2104@iMac ~] $
```

おしまい。
