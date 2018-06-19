---
title: CentOS 6.4 に emacs 24.3 をインストールする
date: "2014-01-13T15:52:50+00:00"
author: jaxx2104
layout: post
path: /centos-6-4-emacs-24-3
category: Terminal
tags:
  - CentOS
  - Emacs
  - Mac
---

## 事前にインストールしておくべきもの。

```
$ sudo yum -y install gcc make ncurses-devel`
```

## Emacs 24.3 をインストールする。

Emacs をダウンロードします。50MB くらいありました。

2014.01.13 時点での最新バージョンは 24.3 です。

最新バージョンの確認は公式で確認してください。

```
$ wget http://ftp.jaist.ac.jp/pub/GNU/emacs/emacs-24.3.tar.gz
```

解凍します。

<!--more-->

```
$ tar xvf emacs-24.3.tar.gz
```

回答されたディレクトリに移動

```
$ cd emacs-24.3
```

configure は x と selinux をなをにしました。

```
$ ./configure -without-x -without-selinux
```

最後は make しましょう。

```
$ make
$ sudo make install
```

## プロファイルの設定

Emacs コマンドで Emacs 24.3 を使うようプロファイルの設定します。

```
$ emacs ~/.bash_profile
```

```shell
alias emacs='/usr/local/bin/emacs-24.3'
```

プロファイルの反映

```
$ emacs ~/.bash_profile
```

Emacs と叩いて Emacs 24.3 が立ち上がれば無事完了です。
