---
title: SwiftとSpriteKitでアプリ開発1:プロジェクト作成からシミュレータ実行まで
created_at: "2015-02-01T15:10:50+00:00"
updated_at: "2015-02-01T15:10:50+00:00"
path: /swift-spritekit1
category: iOS
tags:
  - SpriteKit
  - Swift
  - Xcode
---

![](/wp/images/2015/01/swift-logo-hero-1.jpg)

iOS の新プログラミング言語 Swift をゲームアプリケーションを作りながら触りたいと思います。

フレームワークは SpriteKit を使います。

<img src="./swift-logo-hero-1.jpg" alt="swift-logo-hero-1" />

## プロジェクトの作成

まず Xcode を App Store からインストールし立ち上げ、[File] -> [New] -> [Project] -> [Game] と選択します。Language は Swift で、GameTechnology は SpriteKit にします。

next を押すとプロジェクトの保存場所を聞かれます。

<!--more-->

<img src="./861597b59102c894571b612d973661ad.png" />

プロジェクトができました。GameScene.Swift がアプリケーションの初期画面です。コードを少しだけ見てみましょう。

<small>GameScene.Swift</small>

<img src="./63480dac3b503da40037d59769614a18.png" />

まず、**import SpriteKit** で SpriteKit を利用しています。

クラスの GameScene の**SKScene** は 1 画面の役割です。

`didMoveToView`は画面が呼ばれた際に実行されるメソッド、初期状態では SKLabelNode で&#8221;Hello World&#8221;とセットしています。`touchesBegan`は画面がタップされた時に実行されるメソッド、タッチした座標に SKSpriteNode で画像を表示・回転しています。`update`は画面が毎フレームごと実行されるメソッドです。

## シミュレータ実行

iOS シミュレーターでアプリケーション動かしてみましょう。

デバイスを「iPhone6」選択し、再生アイコンを押します。

<img src="./iOS-Simulator-Screen-Shot-2015.02.01-13.47.19.png" />

iOS シミュレーターが起動し、アプリケーションが実行されれば OK です。

次回から実際に作って行きたいと思います。
