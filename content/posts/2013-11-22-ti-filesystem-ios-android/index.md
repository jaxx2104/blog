---
id: 730
title: Ti.Filesystemを使ってiOSとAndroidでローカル保存
date: "2013-11-22T01:46:33+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=730
path: /ti-filesystem-ios-android
dsq_thread_id:
  - "1986276865"
categories:
  - Titanium
tags:
  - Android
  - applicationDataDirectory
  - externalStorageDirectory
  - iOS
  - Ti.Filesystem
  - Titanium
---

ローカル保存できる場所は各プラットフォームごとで違いがあってややこしいけど、下のように書くのが差分も少ないかなと…。

```js
function doSaveFile(data) {
  var cachefileName = 'test.txt'
  var cacheFilePath = Ti.Filesystem.applicationDataDirectory + 'cache/'
  var directory = Ti.Filesystem.getFile(cacheFilePath)
  //ディレクトリが存在しない場合
  if (!directory.exists()) {
    directory.createDirectory()
  }
  var cacheFile = Ti.Filesystem.getFile(cacheFilePath + cachefileName)
  var cacheFileData = OS_IOS ? cacheFile.read() : cacheFile.read().text
  if (cacheFileData) {
    //append
    cacheFile.write('add : ' + cacheFileData + data)
  } else {
    //new
    cacheFile.write('new : ' + data)
  }
}
```

`applicationDataDirectory`でなく`externalStorageDirectory`にすると、
外部ストレージに保存されます。
ほかのアプリケーションで使ったりできるようなファイルを生成する場合はお勧めです。

ファイルに追記する場合はキャッシュ File.append すればよいと思ったけど、Android はそもそも append が使えないのでこんな感じになってます。
