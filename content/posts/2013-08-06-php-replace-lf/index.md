---
id: 530
title: PHPで改行コードを（LF）に統一する方法
date: "2013-08-06T00:22:48+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=530
path: /php-replace-lf
dsq_thread_id:
  - "1572526481"
image: /wp/images/2013/09/IMG_1003-500x500.jpg
categories:
  - PHP
tags:
  - LF
  - PHP
  - 改行コード
  - 置換
---

<img src="./IMG_1003.jpg" />

<small>最近アイスコーヒーばっかり飲んでいる。</small>

PHP で改行コードを LF（¥n）に統一するには、

```php
$str = preg_replace("/\r\n|\r/","\n",$str);
```

としてあげるだけ。
