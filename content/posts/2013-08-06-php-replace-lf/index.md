---
title: PHPで改行コードを（LF）に統一する方法
created_at: "2013-08-06T00:22:48+00:00"
updated_at: "2013-08-06T00:22:48+00:00"
path: /php-replace-lf
category: PHP
tags:
  - LF
  - PHP
  - 改行コード
  - 置換
---

![](./IMG_1003.jpg)

最近アイスコーヒーばっかり飲んでいる。

PHP で改行コードを LF（\n）に統一するには、

```php
$str = preg_replace("/\r\n|\r/","\n",$str);
```

としてあげるだけ。
