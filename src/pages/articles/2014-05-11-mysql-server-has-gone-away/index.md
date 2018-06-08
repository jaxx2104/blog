---
id: 945
title: MySQL server has gone away エラーが出たときの対処方法
date: "2014-05-11T23:27:36+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=945
path: /mysql-server-has-gone-away
categories:
  - MySQL
  - PHP
tags:
  - PHP
---

PHP から MySQL に接続していて以下のエラーが出た、

原因がつかめなくて詰まったが。解決したのでメモ。

```conf
Warning: mysql_query(): MySQL server has gone away
Warning: mysql_query(): Error reading result set's header
```

<!--more-->

## max_allowed_packet が原因ではなった

調べてみるとメモリ不足とのことで、

max_allowed_packet の値を 32Mb などにしたが、

解決せず。原因は別にあるようだ。

## mysqli::ping による確認

とりあえず接続を行っている箇所の手前で、

ping を送ってサーバとの接続をチェックするとよい。

```php
if ($mysqli->ping()) {
    printf ("Our connection is ok!\n");
} else {
    printf ("Error: %s\n", $mysqli->error);
}
```

## 原因は接続タイムアウト

自分の場合、MySQL の接続とクエリ実行箇所の間に、

関係のなの処理を挟んだせいで接続がタイムアウトしていた。

ですので、タイムアウトの時間を長くとるか。

```php
ini_set('mysql.connect_timeout', 300);
ini_set('default_socket_timeout', 300);
```

もしくはクエリ実行の直前に接続を行うようにすることで、

この問題は解決します。
