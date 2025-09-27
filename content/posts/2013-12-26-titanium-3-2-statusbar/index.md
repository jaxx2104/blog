---
title: Titanium 3.2 から statusbarの文字色を白くする方法が変更になった
created_at: "2013-12-26T09:07:10+00:00"
updated_at: "2013-12-26T09:07:10+00:00"
path: /titanium-3-2-statusbar
category: JavaScript
tags:
  - LightContent
  - statusbar
  - tiapp.xml
  - Titanium
---

ナビゲーションや背景を暗くした時に statusbar の文字色を白にしたかったんだけど、書き方が変わっていたのでメモ。

## Titanium 3.2

tiapp.xml

```xml
<ios>
    <plist>
        <dict>
            <key>UIStatusBarStyle</key>
            <string>UIStatusBarStyleLightContent</string>
        </dict>
    </plist>
</ios>
```

<!--more-->

## Titanium 3.1.3 以前

tiapp.xml

```xml
<statusbar-style>opaque_black</statusbar-style>
```

これで白になるかと思います。
