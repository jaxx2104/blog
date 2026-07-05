---
title: "Rainy75 を ZMK で動かすまで。ついでに PR も出した"
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

自作キーボードのファームウェアをいじるのは久しぶりだった。普段は[QMK の keymap リポジトリ](https://github.com/jaxx2104/qmk-keymaps)を細々と更新している程度で、新しい基板をゼロから焼くのは初めてに近い。

TL;DR:

- Wobkey Rainy 75 Pro に[scholzri/rainy75-zmk](https://github.com/scholzri/rainy75-zmk)の ZMK ファームウェアを焼いた
- clone してすぐビルドしようとしたら 4 つの問題が重なって通らなかったので直した
- その修正を[PR #2](https://github.com/scholzri/rainy75-zmk/pull/2)として出してマージされた
- 焼けた瞬間はやっぱり嬉しい

## Rainy 75 を選んだ理由

Wobkey というメーカーの 75% メカニカルキーボード。ガスケットマウント、ポロン/PC プレート、工場潤滑済みスイッチ、そしてトップケースとボトムケースのどちらでもない「まわり込む」形のアクリルディフューザーが特徴。いわゆる中華ブランドの製品だけど、ビルドクオリティは高い。

MCU は Telink TLSR9511 (RISC-V)。STM32 や RP2040 とはまったく違うアーキテクチャで、もともとのファームウェアはクローズド。キーマップの書き換え手段は公式ツールに限られていた。

## ZMK、QMK、そしてよくわからない人のために

この記事を読むのに必須の知識ではないけど、ZMK がどういう位置づけか知っておくと話がわかりやすいと思う。

**QMK**は最も普及しているキーボードファームウェア。AVR や ARM で動き、`make`でビルドして`dfu-programmer`などで書き込む。基本は有線。対応キーボードの数は圧倒的。

**ZMK**は[Zephyr RTOS](https://www.zephyrproject.org/)の上で動くキーボードファームウェア。QMK との違い:

- ビルドシステムは`make`ではなく[`west`](https://docs.zephyrproject.org/latest/develop/west/index.html)。Zephyr のビルドシステムをそのまま使い、ボード定義 (DTS/Kconfig) も Zephyr の流儀に従う
- BLE が標準。左右分割キーボードの無線接続がファームレベルでサポートされている
- キーマップは C 言語の`keymap.c`ではなく、Devicetree 形式の`.keymap`ファイルで書く
- QMK より後発だが、新しめのワイヤレス対応キーボードは最初から ZMK を採用するものが増えている

つまり QMK は有線キーボードのデファクトスタンダード、ZMK はワイヤレスキーボードのこれからという立ち位置。

## リバースエンジニアリングの偉業

[scholzri/rainy75-zmk](https://github.com/scholzri/rainy75-zmk)は単なる ZMK 移植プロジェクトではない。Ghidra を使ったリバースエンジニアリングの成果をベースに、Zephyr のボードサポートを新規作成している。

リポジトリのトピックを見るとその守備範囲がわかる:

`b91`, `firmware`, `ghidra`, `keyboard`, `reverse-engineering`, `riscv`, `telink`, `tlsr9511`, `zephyr`, `zmk`

Telink B91 というアーキテクチャは一般的なキーボード用 MCU とかけ離れている。そこに対して`zmk/boards/rainy75/`以下に DTS と Kconfig を新規追加し、`west build -b rainy75`でビルドできるようにしている。結構な労力だと思う。

## いきなりビルドが通らない

README に従って clone → `west update` → `west build`したら、ビルドが通らなかった。いくつか独立した問題が重なっていた。

1 つ目は`.gitignore`。`zephyr/`というパターンがルートの`zephyr/`だけでなく`zmk/zephyr/`にもマッチし、ZMK の Zephyr module が git 管理対象から外れていた。そのため`zmk/zephyr/module.yml`がコミットされず、`west build`が "No board named 'rainy75'" で落ちる。

2 つ目は ZMK のコミット参照。upstream の[zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)から到達できないコミットを指していたので`west update`が失敗する。公開リポジトリから到達可能な最新の ZMK main に差し替えた。

3 つ目は Kconfig。`CONFIG_ZMK_SLEEP`を有効にするには`HAS_POWEROFF`の select が不足していた。`poweroff.c`はすでに存在していたので、Kconfig に select を追加すれば解決する。

4 つ目は未定義の Kconfig オプション。`conf/app.conf`に`CONFIG_ZMK_USB_NO_VBUS_DETECT`が書いてあったが、これが未定義で Kconfig パース時に abort する。

どれも 1 行か 2 行の修正だが、組み合わさると clone からビルドまで一直線に進めない。

## 修正して PR、実機へ

修正をまとめて[PR #2](https://github.com/scholzri/rainy75-zmk/pull/2)を出した。5 ファイル、+10/-3 のミニマルな変更。

```diff
- .gitignore の zephyr/ を /zephyr/ にアンカー
+ zmk/zephyr/module.yml を追加 (board_root / dts_root / cmake / kconfig)
- zmk/west.yml の ZMK コミットを到達可能なものに差し替え
+ Kconfig.rainy75 に select HAS_POWEROFF を追加
- conf/app.conf から未定義の CONFIG_ZMK_USB_NO_VBUS_DETECT を削除
```

PR の description には原因と修正を書いて、実機で USB HID + BLE + deep-sleep が動くことを verification として添えた。この PR はマージされた。

実機に書き込んでキーを押したら文字が届いた瞬間はやっぱり嬉しい。今回は自分が直したビルド修正を使って焼けたので、単なる consumer ではなくプロジェクトの一部として参加できた感じがある。OSS のファームウェアプロジェクトに PR を出して merge されるのは、キーボードの楽しみ方のひとつだと思う。

当面はこの ZMK 設定をベースに、普段の[QMK keymap](https://github.com/jaxx2104/qmk-keymaps)と同じようにキーマップを育てていくつもり。scholzri/rainy75-zmk 自体も ZMK 本体のアップデート追従や RGB 設定がどこまで進むかというフェーズに入っていく。自分の[fork](https://github.com/jaxx2104/rainy75-zmk)も追従していく。