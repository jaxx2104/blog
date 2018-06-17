---
title: Atom から VScode のエディタ移行と拡張機能について
date: "2017-03-19T23:15:00+00:00"
author: jaxx2104
layout: post
path: /atom-to-vscode
image: ./atom-to-vscode.png
description: いままでコードを書くとき Emacs か Atom で書いてました。
category: 開発環境
tags:
  - VSCode
---

ローカルではもっぱら Atom を使っていたのですが自分の環境だとちょっと立ち上がりが重い。
さすがに耐えられなくなって少し前から Visual Studio Code にエディタを移行してみています。

追加した拡張機能などメモしておきます。

## 拡張機能

Git や Lint 関連の機能は初期状態で動作していて、とても始めやすい設定になっていました。

### テーマ

- Material-theme
- vscode-icons: サイドバーにファイルアイコンが付く

### 言語

- vue
- Sass

### 整形/スニペット系

- ESlint: JS 構文チェック
- Beautify: 自動整形ツール
- Document This: コメント挿入ツール
- HTML Snippets: HTML スニペット
- ES6 code snippets: JS スニペット
- vutur

### その他

- Setting Sync: エディタ環境同期
- Project Manager: プロジェクト管理
- REST Client: REST API を実行するツール
- Debugger Chrome: Chrome デバッガを実行するツール

<!--more-->

## 設定

カラーテーマは`Monokai`。
フォントは`SourceCodePro-Light`にしています。

```js
{
    "sync.autoDownload": true,
    "sync.autoUpload": true,
    "sync.lastDownload": "",
    "sync.showSummary": true,
    "sync.forceDownload": false,
    "sync.anonymousGist": false,
    "workbench.iconTheme": "vscode-icons",
    "workbench.colorTheme": "Monokai",
    "editor.fontFamily": "SourceCodePro-Light, Menlo, Monaco, 'Courier New', monospace",
    "editor.renderWhitespace": "boundary",
    "editor.cursorStyle": "line-thin",
    "editor.minimap.enabled": true,
    "files.trimTrailingWhitespace": true,
    "extensions.autoUpdate": true,
    "workbench.activityBar.visible": true,
    "vsicons.projectDetection.autoReload": true,
}
```

以上。
Emacs のキーマップ拡張機能とかもあるので便利そう。
