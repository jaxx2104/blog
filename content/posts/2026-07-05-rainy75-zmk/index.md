---
title: "Rainy75 に ZMK を焼いて、ついでに上流に PR を出した"
created_at: '2026-07-05T00:00:00.000Z'
updated_at: '2026-07-05T00:00:00.000Z'
path: /rainy75-zmk
description: "Wobkey Rainy 75 Pro を OSS の ZMK ファームウェアに載せ替えた。焼くだけじゃなくて、clone してすぐビルドできない問題を直して PR まで出した話。"
category: 自作キーボード
tags:
  - keyboard
  - zmk
  - rainy75
  - firmware
---

自作キーボードのファームウェアをいじるのは久しぶりだった。普段は QMK の keymap リポジトリを細々と更新している程度で、新しい基板をゼロから焼くのは初めてに近い。

今回のターゲットは Wobkey Rainy 75 Pro。元々は独自ファームウェアで動いていて、ZMK の選択肢は存在しなかった。それが scholzri/rainy75-zmk (https://github.com/scholzri/rainy75-zmk) でリバースエンジニアリングと移植が進み、誰でも焼ける状態になったと聞いて、試してみた。

## そもそも Rainy 75 って何

Rainy 75 は Wobkey というメーカーの 75% メカニカルキーボード。ガスケットマウント、ポロン/PC プレート、工場潤滑済みスイッチ、そしてトップケースとボトムケースのどちらでもない「まわり込む」形のアクリルディフューザーが特徴。いわゆる中華ブランドの文脈で出てきた製品だけど、ビルドクオリティは高い部類だと思う。

搭載されている MCU は Telink TLSR9511 (RISC-V) で、STM32 や RP2040 系とはまったく違うアーキテクチャ。もともとのファームウェアはクローズドで、ユーザーがキーマップを書き換える手段は公式ツールに限られていた。

## ZMK って何

QMK は知ってるけど ZMK はよく知らない人、そもそも QMK も知らない人向けに、簡単に整理しておく。

**QMK**は最も普及しているキーボードファームウェア。AVR (ATmega32U4 など) や ARM (STM32) で動き、`make`でビルドして`dfu-programmer`や`qmk flash`で書き込む。基本的に有線。歴史が長く、対応キーボードが圧倒的に多い。

**ZMK**は Zephyr RTOS の上で動くキーボードファームウェア。QMK と大きく違うのは次の点。

- ビルドシステムは`make`/`qmk`ではなく`west`。Zephyr のビルドシステムをそのまま使う形で、ボード定義 (DTS/Kconfig) も Zephyr の流儀に従う
- BLE が標準で組み込まれていて、左右分割キーボードの無線接続がファームレベルでサポートされている。QMK にも実験的な BLE サポートはあるけど、ZMK は設計の最初からワイヤレスが前提
- キーマップは QMK の`keymap.c`（C 言語でレイヤーやコンボを書く）に対して、ZMK は`.keymap`という Devicetree 形式のファイルで書く。C のコードを書かずに設定だけで完結するケースが多い
- QMK より後発なので対応キーボードはまだ少ない。その代わり、新しめのワイヤレス対応キーボードは最初から ZMK を採用しているものも増えている

つまり、QMK は「有線キーボードのデファクトスタンダード」で、ZMK は「ワイヤレスキーボードのこれから」という立ち位置。両方知っておくと、キーボードを選ぶときの選択肢が広がる。

## scholzri/rainy75-zmk のリバースエンジニアリング

scholzri/rainy75-zmk は、単なる ZMK 移植プロジェクトではない。Ghidra を使ったリバースエンジニアリングの成果を基に、Zephyr のボードサポートを新規作成している。

リポジトリのトピックを見るとその範囲がわかる:

`b91`, `firmware`, `ghidra`, `keyboard`, `reverse-engineering`, `riscv`, `telink`, `tlsr9511`, `zephyr`, `zmk`

Telink B91 というアーキテクチャは一般的なキーボード用 MCU とはかけ離れている。そこに対して`zmk/boards/rainy75/`以下に DTS (Devicetree) と Kconfig を新規追加し、`west build -b rainy75`でビルドできるようにしている。結構な労力だと思う。

## ビルドしてみたら落ちた

README に従って clone して`west update` → `west build`したら、ビルドが通らなかった。いくつか独立した問題が重なっていた。

1 つ目は`.gitignore`。`zephyr/`というパターンがルートの`zephyr/`だけでなく`zmk/zephyr/`にもマッチしていて、ZMK の Zephyr module が git 管理対象から外れていた。その結果`zmk/zephyr/module.yml`がコミットされず、`west build`が "No board named 'rainy75'" で落ちる。

2 つ目は ZMK のコミット参照。upstream の`zmkfirmware/zmk`から到達できないコミットを指していたので、`west update`が失敗する。公開リポジトリから到達可能な最新の ZMK main に差し替えた。

3 つ目は Kconfig。`CONFIG_ZMK_SLEEP`を有効にするには`HAS_POWEROFF`の select が不足していた。`poweroff.c`はすでに存在していたので、Kconfig で select を追加すれば解決する。

4 つ目は未定義の Kconfig オプション。`conf/app.conf`に`CONFIG_ZMK_USB_NO_VBUS_DETECT`が書いてあったが、これが未定義で Kconfig パース時に abort する。

どれも 1 行か 2 行の修正だが、組み合わさると clone からビルドまで一直線に進めない。

## PR #2: fix/buildable

修正内容をまとめて PR を出した。5 ファイル、+10/-3 のミニマルな変更。

```diff
- .gitignore の zephyr/ を /zephyr/ にアンカー
+ zmk/zephyr/module.yml を追加 (board_root / dts_root / cmake / kconfig)
- zmk/west.yml の ZMK コミットを到達可能なものに差し替え
+ Kconfig.rainy75 に select HAS_POWEROFF を追加
- conf/app.conf から未定義の CONFIG_ZMK_USB_NO_VBUS_DETECT を削除
```

PR の description には原因と修正をそれぞれ書いた。`build.sh -pa`で`combined.bin`、`bridge_ota.bin`、`zmk.signed.bin`が全部ビルドできることも確認した。実機で USB HID + BLE + deep-sleep が動くことも添えた（Ubuntu でビルド、実機は ANSI 版）。

この PR はマージされた。

## 焼けた感想と今後

実機に書き込んで、キーを押したら PC に文字が届いた瞬間はやっぱり嬉しい。QMK と違って ZMK は west build のフローに慣れるまで少し戸惑うけど、一度通ってしまえばあとは west build → west flash のループが回せる。

今回は特に、自分が直したビルドの修正を使って焼けたので、単なる consumer ではなくてプロジェクトの一部として参加できた感じがある。OSS のファームウェアプロジェクトに PR を出して merge されるのは、キーボードの楽しみ方のひとつだと思う。

当面はこの ZMK の設定をベースに、普段の QMK keymap リポジトリと同じようにキーマップを育てていくつもり。今のところは ANSI のベーシックな配列で、後日レイヤー構成を煮詰める。scholzri/rainy75-zmk 自体も、ZMK 本体のアップデート追従や RGB 設定がどこまで進むか、というフェーズに入っていくはず。自分の fork も追従していく。