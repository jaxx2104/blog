---
title: Macbook Air 買ったので環境構築します
date: "2013-11-25T01:14:59+00:00"
author: jaxx2104
layout: post
path: /macbook-air-app-install
image: ./IMG_1593.jpg
description: 今週末 Macbook Air 13 インチの梅買いました。 メモリ ４GB でも Xcode サクサクです。
category: 開発環境
tags:
  - Android
  - Emacs
  - Genymotion
  - Mac
  - Titanium
---

## 経緯

今まで NVIDIA 搭載していて 3D CAD なんかもバリバリ動いてた ThinkPad の T420si を使っていました。
勉強会で持ち運んだりアプリケーション作ったりっていう使い方になってきたのでオークションに出品して、それを元に買いました。

<!--more-->

## 環境

## ブラウザ

Chrome Canary

インストール作業の一番初めにこれ入れる。

http://www.google.co.jp/intl/ja/chrome/browser/canary.html

## ターミナル

iTerm2

Mac 標準のターミナルより便利

http://www.iterm2.com/#/section/home

テーマはこれ使ってます。

https://raw.github.com/episko/iterm2-monokai/master/Monokai.itermcolors

## パッケージ管理

Homebrew

いれたら brew doctor してね。

http://brew.sh/

その時に入れるとくとよいやつ。

wget - curl でもよいけど慣れです。

npm - パッケージ管理

nodejs - いろいろ使う

あと .bash_profile をここで作った。

## テキストエディタ

Emacs 24

僕らの Emacs。Homebrew を使って入れた。

http://www.stuartgunter.org/emacs-setup-mac/

Sublime Text3

流行っているので入れた。まだ馴染みはない。

http://www.sublimetext.com/3

Elisp とかはほかのマシンからごっそり移行してます。

## 開発ツール

JDK

まずこれを入れておく。

Xcode

iOS 開発ツール

Xcode Command LINE Tool

Titanium で必要になる

Preference > Download > Command LINE Tool

Android SDK

2.3.3 と 4 系最新あればよいかと、

Android Emulator が重い。

Titanium Moblile

アプリケーションの開発は Titanium を使っています。

JavaScript で書いて各プラットフォームでビルドしてます。

## 仮想

VirtualBox

仮想マシンをたている時に使うけど、air は用途的に

Windows や Linux 入れたりはしないかなあ。

Genymotion

Android Emulator を仮想化したやつ

起動も早いので開発がスムーズに。

## App Store

evernote - メモ

Rocket − ブログ書くやつ

transmit − FTP クライアント

Windows Magnet − Windows っぽく画面分割するやつ

Dash − 各言語のドキュメントが引けるやつ

Alfred − 検索型ランチャー

Caffeine − スリーブ ONOFF

key4remap

あと今回、keynote,Number,Pager が無料でついてくる。

こんな感じ。何かよいソフトあれば教えてください。
