---
title: FuelPHP で「oops an unexpected error has occurred」の画面が出た場合
date: '2015-03-05T21:50:23+00:00'
author: jaxx2104
layout: post
path: /fuelphp-oops-an-unexpected-error-has-occurred
image: ./1415367437FuelPHP.jpg
category: PHP
tags:
  - Apache
  - FuelPHP
---

環境変数の値を変更するとエラー内容を表示できる。

## Apache の場合

**httpd.conf**

```
# SetEnv FUEL_ENV PRODUCTION
SetEnv FUEL_ENV DEVELOPMENT
```

## nginx の場合

**nginx.conf**

```
# fastcgi_param FUEL_ENV "PRODUCTION";
fastcgi_param FUEL_ENV "DEVELOPMENT";
```

> インストール方法 - インストール - FuelPHP ドキュメント
> <a href="http://fuelphp.jp/docs/1.8/installation/instructions.html" title="http://fuelphp.jp/docs/1.8/installation/instructions.html" target="_blank">http://fuelphp.jp/docs/1.8/installation/instructions.html</a>
