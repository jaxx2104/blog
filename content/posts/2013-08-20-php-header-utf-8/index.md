---
title: PHPで文字コードをUTF-8にする
created_at: "2013-08-20T00:57:59+00:00"
updated_at: "2013-08-20T00:57:59+00:00"
path: /php-header-utf-8
category: PHP
tags:
  - PHP
  - UTF-8
  - 文字コード
---

PHP 部分で文字化けが起きた場合

この一行を追加する。

```php
header('Content-Type: text/html; charset=UTF-8');
```
