---
id: 1299
title: node.jsとnpmインストールとアップデート
date: "2016-03-11T00:41:12+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=1299
path: /node-js-install-update
image: /wp/images/2016/03/nodejs-image-processing-600x300-1.png
categories:
  - CentOS
  - JavaScript
  - node.js
---

<img src="./nodejs-image-processing.png" alt="nodejs-image-processing" />

Node.js と npm インストール

```s
$ sudo yum install nodejs npm -enablerepo=epel
$ sudo yum install gcc gcc-c++
```

<!--more-->

n のインストール

```s
$ sudo npm install -g n
```

n を使って Node.js のアップデート

```s
$ n -stable
$ sudo n -stable
$ sudo n -latest
$ sudo n latest
```

nam のアップデート

```s
$ sudo npm update -g npm
$ sudo npm update -g
$ sudo npm outdated -g
```

こんな感じでサーバ上に JS を動かすことができる

```s
$ node
> console.log("hello world!")
hello world
```
