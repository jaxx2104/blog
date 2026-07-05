---
title: "Rainy75 を ZMK Firmware で動かす"
created_at: '2026-07-05T00:00:00.000Z'
updated_at: '2026-07-05T00:00:00.000Z'
path: /rainy75-zmk
description: "Wobkey Rainy 75 Pro を OSS の ZMK ファームウェアに載せ替えた。clone してもビルドが通らないので直して上流に PR を出し、ANSI で効かない Enter キーの原因も突き止めた話。"
category: 自作キーボード
tags:
  - keyboard
  - zmk
  - rainy75
  - firmware
---

キーボードのファームウェアを触るのは久しぶりです。普段は[QMK の keymap リポジトリ](https://github.com/jaxx2104/qmk-keymaps)を細々と更新している程度でしたが、今回は Wobkey の Rainy 75 Pro を OSS の[ZMK](https://zmk.dev/)に載せ替えました。焼くだけのつもりが、clone してもビルドが通らなかったので、直して上流に PR を出すところまでやっています。

TL;DR:

- Wobkey Rainy 75 Pro に[scholzri/rainy75-zmk](https://github.com/scholzri/rainy75-zmk)の ZMK ファームウェアを焼いた
- clone 直後のビルドを止める問題が 4 つあったので、まとめて直して[PR #2](https://github.com/scholzri/rainy75-zmk/pull/2)を出した。マージされた
- 手元の ANSI 配列では Enter キーが効かず、原因を突き止めて[issue #1](https://github.com/scholzri/rainy75-zmk/issues/1)で報告した
- キーマップは QMK 時代と同じ[qmk-keymaps](https://github.com/jaxx2104/qmk-keymaps)で管理する

## Rainy 75 Pro と ZMK 移植プロジェクト

[Rainy 75 Pro](https://wobkey.com/products/rainy75)は Wobkey の 75% メカニカルキーボードです。ガスケットマウントで打鍵感がよく、いわゆる中華ブランドですがビルドクオリティは高い。ただし MCU が Telink TLSR9511 (B91, RISC-V) というキーボードでは珍しいチップで、ファームウェアは Evision 系のクローズドなものです。キーマップは[VIA](https://www.usevia.app/)で書き換えられますが、できるのはそこまで。

[scholzri/rainy75-zmk](https://github.com/scholzri/rainy75-zmk)は、この stock ファームウェアを[Ghidra](https://ghidra-sre.org/)でリバースエンジニアリングして ZMK を移植したプロジェクトです。ファームウェア内の 211 関数をすべて特定し、キーマトリクスや RGB の配線、OTA アップデートのプロトコルまで解読しています。おかげでケースを開けず、デバッガも使わずに、stock の OTA 経路をそのまま使って ZMK を焼けます。`restore_stock.sh`で純正に戻す道も用意されています。`docs/`以下の解析記録だけでも読み物として面白いです。

ZMK は[Zephyr RTOS](https://www.zephyrproject.org/)の上に乗ったキーボードファームウェアで、[QMK](https://qmk.fm/)と違ってビルドは`make`ではなく[west](https://docs.zephyrproject.org/latest/develop/west/index.html)、キーマップは`keymap.c`ではなく Devicetree 形式で書きます。BLE が標準で、ワイヤレス前提の設計です。

## clone してもビルドが通らない

README のとおり clone → `west update` → `west build`と進めたら、ビルドが通りませんでした。独立した問題が 4 つ重なっています。

1. `.gitignore`の`zephyr/`パターンがルートだけでなく`zmk/zephyr/`にもマッチしていて、Zephyr module の manifest である`zmk/zephyr/module.yml`がコミットされていない。module が登録されないので`west build`が`No board named 'rainy75'`で落ちる
2. `zmk/west.yml`が pin している ZMK のコミットが[zmkfirmware/zmk](https://github.com/zmkfirmware/zmk)のどの ref からも辿れず、`west update`が失敗する。push され忘れたコミットらしい
3. `CONFIG_ZMK_SLEEP=y`が要求する`HAS_POWEROFF`をどこも select しておらず、Kconfig が abort する。`poweroff.c`の実装はすでにあるので、board の Kconfig に 1 行足りないだけ
4. `conf/app.conf`が、pin されている ZMK には存在しない`CONFIG_ZMK_USB_NO_VBUS_DETECT`に代入していて、これも Kconfig が abort する

ほかに、README に書かれていないセットアップも 2 つ必要でした（`pip install -r zephyr/scripts/requirements.txt`と`west zephyr-export`）。どれも直すのは 1〜2 行ですが、これだけ重なると clone からビルドまで一直線には進めません。

## 直して PR を出した

修正は、ビルドを止めている問題だけに絞って[PR #2](https://github.com/scholzri/rainy75-zmk/pull/2)を出しました。5 ファイル、+10/−3 です。いちばん効いた修正は`.gitignore`の 1 文字でした。

```diff
 # West workspace (fetched by west update)
 zmk-src/
-zephyr/
+/zephyr/
```

これで`zmk/zephyr/module.yml`を commit できるようになり、board 定義が west に認識されます。残りは west.yml の pin を到達可能なコミットへ差し替え、`Kconfig.rainy75`に`select HAS_POWEROFF`を追加、未定義シンボルの削除です。

PR の説明には原因と修正に加えて、`./build.sh -pa`がクリーンに通ることと、実機で USB HID・BLE・deep sleep が動いていることを検証として書きました。マージされています。

## ANSI の Enter が効かない

ビルドが通っても、もうひとつ問題が残っていました。この移植は作者の ISO DE 配列向けで、ANSI は「実験的・実機未検証」の扱いです。手元のユニットは ANSI で、そのまま焼くと物理の横長 Enter を押しても何も起きず、代わりに backslash の位置が Enter として効きます。

調べると原因は 2 段階でした。

1 つ目は、ANSI 用の`#ifdef CONFIG_RAINY75_ANSI`が構造的に効かないこと。keymap の overlay は Kconfig の処理より先に C プリプロセッサを通るので、`-DCONFIG_RAINY75_ANSI=y`を付けてビルドしてもこのマクロは未定義のまま、常に ISO 側の分岐が使われます。生成された`zephyr.dts`を確認すると、「ANSI ビルド」でも ISO のキーマップが出力されていました。

2 つ目は matrix transform です。ANSI の横長 Enter はマトリクスの`RC(3,13)`に配線されていますが、ISO 向けの transform はこの位置を飛ばしています。stock ファームウェアの VIA レイアウトと行を突き合わせると、home row が`; ' → NUHS → ENT`と並んでいて`(3,13)`が Enter だと確定できました。transform に`RC(3,13)`を足して`&kp RET`を割り当てれば直ります。

この 2 つは自分の[fork](https://github.com/jaxx2104/rainy75-zmk)で直して、経緯は[issue #1](https://github.com/scholzri/rainy75-zmk/issues/1)にまとめて報告しました。ANSI/ISO の切り替えをどう設計するかは作者の判断が要るところなので、PR はビルド修正と切り離しています。

## キーマップは QMK と同じリポジトリに置く

キーマップ本体は、これまでの QMK ボードと同じ[qmk-keymaps](https://github.com/jaxx2104/qmk-keymaps)に`keyboards/wuque_studio/rainy75/zmk/rainy75.keymap`として置きました。リポジトリ名に反して ZMK ですが、キーマップの置き場は 1 箇所にまとめておきたい。

Space 両隣の英数・かなは、ほかの QMK ボードで使っている Mod-Tap をそのまま移しています。

| QMK (他のボード) | ZMK (Rainy75) | 動き |
| --- | --- | --- |
| `CK_EISU` | `&mt LGUI LANG2` | tap で英数、hold で GUI |
| `CK_KANA` | `&mt RALT LANG1` | tap でかな、hold で Alt |

Fn レイヤーには Bluetooth のプロファイル切り替え (Fn+F1〜F3)、USB/BLE の出力切り替え (Fn+F4)、[ZMK Studio](https://zmk.dev/docs/features/studio)のアンロック (Fn+Esc)、RGB の操作を割り当てています。

## 実機に焼いて、動いた

書き込んで、キーを押したら文字が届きました。自分の直したビルドで焼けているので、プロジェクトに参加できた感じがあります。OSS のファームウェアに PR を出してマージされるのは、キーボードの楽しみ方のひとつだと思います。

当面はこの構成をベースに、ほかのボードと同じようにキーマップを少しずつ更新していきます。scholzri/rainy75-zmk 自体もまだ動きのあるプロジェクトなので、fork も追従していくつもりです。
