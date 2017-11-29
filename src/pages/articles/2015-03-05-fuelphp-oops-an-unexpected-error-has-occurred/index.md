---
id: 1210
title: FuelPHP で「oops an unexpected error has occurred」の画面が出た場合
date: "2015-03-05T21:50:23+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=1210
path: /fuelphp-oops-an-unexpected-error-has-occurred
image: /wp/images/2015/03/1415367437FuelPHP-800x3231.jpg
categories:
  - FuelPHP
tags:
  - apache
  - PHP
---
<img src="./1415367437FuelPHP.jpg" alt="1415367437FuelPHP" />

環境変数の値を変更するとエラー内容を表示できる。

## Apache の場合

**httpd.conf**

```conf
# SetEnv FUEL_ENV PRODUCTION
SetEnv FUEL_ENV DEVELOPMENT
```

<!--more-->

## nginx の場合

**nginx.conf**

```conf
# fastcgi_param FUEL_ENV "PRODUCTION";
fastcgi_param FUEL_ENV "DEVELOPMENT";
```

> インストール方法 - インストール - FuelPHP ドキュメント

> <a href="http://fuelphp.jp/docs/1.8/installation/instructions.html" title="http://fuelphp.jp/docs/1.8/installation/instructions.html" target="_blank">http://fuelphp.jp/docs/1.8/installation/instructions.html</a>
