---
title: PHPで改行コードを（LF）に統一する方法
date: "2013-08-06T00:22:48+00:00"
author: jaxx2104
layout: post
path: /php-replace-lf
image: ./IMG_1003.jpg
category: PHP
tags:
  - LF
  - PHP
  - 改行コード
  - 置換
---

最近アイスコーヒーばっかり飲んでいる。

PHP で改行コードを LF（\n）に統一するには、

```php
$str = preg_replace("/\r\n|\r/","\n",$str);
```

としてあげるだけ。
