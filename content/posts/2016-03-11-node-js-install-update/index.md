---
title: Node.jsとnpmインストールとアップデート
date: '2016-03-11T00:41:12+00:00'
author: jaxx2104
layout: post
path: /node-js-install-update
image: ./nodejs-image-processing.png
category: JavaScript
tags:
  - Node.js
  - npm
---

Node.js と npm インストール

```
$ sudo yum install nodejs npm -enablerepo=epel
$ sudo yum install gcc gcc-c++
```

n のインストール

```
$ sudo npm install -g n
```

n を使って Node.js のアップデート

```
$ n -stable
$ sudo n -stable
$ sudo n -latest
$ sudo n latest
```

nam のアップデート

```
$ sudo npm update -g npm
$ sudo npm update -g
$ sudo npm outdated -g
```

こんな感じでサーバ上に JS を動かすことができる

```
$ node
> console.log("hello world!")
hello world
```
