---
title: "FlexiSpot の昇降デスクを ESPHome で Home Assistant に繋いだ 4 日間"
created_at: '2026-09-03T00:00:00.000Z'
updated_at: '2026-09-03T00:00:00.000Z'
path: /flexispot-esphome
description: "FlexiSpot 昇降デスクのハンドセット用 RJ45 には UART が流れている。M5Stack ATOM Lite に ESPHome を載せて割り込ませ、Home Assistant から動かすまでの 4 日間。切った LAN ケーブルの不良で受信ゼロのまま数時間かかり、ブレイクアウト基板に替えたら一行も変えずに動いた。"
category: 開発環境
tags:
  - homeassistant
  - esphome
  - smarthome
---

書斎の FlexiSpot 昇降デスクを [Home Assistant](https://www.home-assistant.io/) から動かせるようにしました。ハンドセットとコントロールボックスを繋ぐ RJ45 ケーブルに UART が流れていて、そこに ESP32 を割り込ませるだけです。既存の記事はどれも簡単と書いていて、配線が済んでからは実際そのとおりでしたが、配線が済むまでに 3 日かかったので備忘録です。

TL;DR:

- LAN ケーブルを切って直結したら、送信は通るのに受信が 1 バイトも来ない状態で数時間かかった。原因は自作ケーブル側の断線か接触不良
- 数百円の RJ45 ブレイクアウト基板を先に買えば、切る必要がそもそもない
- ESPHome の entity 名を日本語にすると config validation が落ちるか、entity が別物として登録し直される。名前は ASCII で固定して、日本語は HA の alias で与える
- expose ラベルを付けても Google Home に出てこないときは Matter Hub の再起動が要る

## きっかけ

[him0](https://x.com/him0net) さんから「FlexiSpot はこれができる」と教えてもらったのが始まりです。ついでに [M5Stack ATOM Lite](https://www.switch-science.com/products/6262) をもらいました。

やり方は [iMicknl/LoctekMotion_IoT](https://github.com/iMicknl/LoctekMotion_IoT) にまとまっています。FlexiSpot の多くは LoctekMotion 製のコントロールボックスを使っていて、ハンドセットとの間の RJ45 には Ethernet ではなく 9600bps の UART が流れています。先頭が`9b`、末尾が`9d`のフレームにコマンドと高さが乗っています。ESP32 から同じフレームを送れば操作でき、受信すれば高さが取れます。ESPHome 用の外部 component と YAML もこのリポジトリに揃っています。

日本語の記事は [izm_11 さんの 1 本](https://izm-11.hatenablog.com/entry/2024/01/26/171807)だけ見つけました。M5AtomS3 に自作ファームを載せる構成で、ESPHome と Home Assistant の話はないので、自分の分を書いておきます。

## 構成

- M5Stack ATOM Lite(ESP32-PICO)に [ESPHome](https://esphome.io/) 2026.5 以降(esp-idf)
- コントロールボックスの空いている RJ45 ポートに挿す。ポートが 2 つあるので、純正ハンドセットは繋いだまま
- ATOM の電源はデスクの RJ45 から出ている 5V。USB は挿さない
- Home Assistant には cover(高さ制御)、number(高さ指定)、座り・立ちのプリセットボタン、高さセンサーとして見える

ハンドセットを残したのは、失敗したときにいつでも純正に戻せるからです。副産物として、ハンドセットが繋がっている間はコントロールボックスが起きたままなので、既存記事が必須としている PIN20 の駆動なしでコマンドが通りました。

## Day 1: ケーブルを切って繋ぐ

手元に LAN ケーブルがあったので、切って被覆を剥いて、芯線を ATOM に直接繋ぎました。上流の README に載っているピン配列のとおり、8 本のうち 5 本を使います。

| 線色 (T568B) | ATOM Lite | 役割 |
|---|---|---|
| 茶 | 5V | 給電 |
| 白/茶 | GND | |
| 緑 | GPIO19 | ESP → デスク |
| 白/青 | GPIO22 | デスク → ESP |
| 青 | GPIO23 | PIN20 |

YAML は上流の`packages/office-desk-esp32.yaml`をほぼそのまま持ってきました。ESPHome アドオンが`github://`からの clone に失敗したので、外部 component はリポジトリ内に vendoring しています。

焼いて HA から上を押すとデスクが動いて、ここまで 1 時間くらいだったので簡単だと思いました。ただ、高さが取れません。ESPHome のログを見ると、送信(`>>>`)は 4 回とも出ているのに、60 秒待っても受信(`<<<`)が 0 バイトでした。

デスクが動く以上、5V・GND・送信線は生きているはずです(デスク給電で 240 秒以上動いていました)。残るは受信線だけです。既存記事が最頻出のミスとして挙げているのが TX/RX の逆配線なので、それを疑いました。

まず substitutions で TX と RX のピンを入れ替えられるようにして、物理配線を触らずに OTA で両方の向きを試しましたが、変わりませんでした。

次に、デスク側の TX がどの線なのかを疑いました。ピン番号の数え方が資料によって逆で、色の対応も記事間で食い違っています。1 本ずつ rx_pin を変えて焼き直すと最大 3 往復かかるので、logger の UART 出力を止めて(`baud_rate: 0`)UART0 を空け、信号線 3 本を同時に RX 監視する probe 設定を焼きました。

```yaml
logger:
  baud_rate: 0  # UART0 を空けて 3 本目の UART に使う

uart:
  - id: probe_a3
    rx_pin: GPIO19
    baud_rate: 9600
    debug:
      direction: RX
      dummy_receiver: true
      sequence:
        - lambda: 'ESP_LOGD("probe", "A3 green   (G19): %s", format_hex_pretty(bytes).c_str());'
  # 同じものを GPIO22 (A4) と GPIO23 (A5) にも
```

どの線にも何も流れてきませんでした。

この日はここで終わりです。probe 専用構成だと操作系が全部消えて実用にならないので、通常設定に戻しつつ、残った候補の線だけ受信監視する形にして寝ました。

## Day 2: 基板を注文して待つ

上流の issue を漁っていたら [#129](https://github.com/iMicknl/LoctekMotion_IoT/issues/129) が同じ症状でした。下降・停止・プリセットは動くのに高さだけ取れない。あちらの結末は、テスターで調べたら RX 線が断線していて、別のケーブルに替えたら直った、というものです。

デスクが動いていたので、自分のケーブルを疑っていませんでした。5 本のうち 1 本だけ断線している可能性を考えていなかったわけです。

RJ45 ブレイクアウト基板を 5 枚で 1,299 円、CAT6A の短いケーブルを 2 本、Amazon で注文しました。

## Day 3: 基板に替えたら受信できた

基板が届いて、市販のケーブルをそのまま挿し、基板のピンから ATOM にジャンパで繋ぎ替えました。YAML は一行も変えずに受信できました。テスターで当てたわけではないですが、原因は自作ケーブル側の断線か接触不良で間違いなさそうです。剥いた芯線をピンヘッダに繋ぐところで 1 本だけ導通がなかったのだと思います。

受信が取れると、あとは仕上げです。可動域を実測すると 62.5〜128.0cm でした。上下限に達したら up/down の連投を止める判定に使うので、境界ちょうどではなく少し内側の値を指定しています。境界ちょうどにすると`on_value_range`の below/above が発火せず、送信が止まらなくなります。

```yaml
substitutions:
  min_height: "62.6"
  max_height: "127.9"

sensor:
  - platform: loctekmotion_desk_height
    id: desk_height
    name: Height
    uart_id: desk_uart
    unit_of_measurement: cm
    on_value_range:
      - below: ${min_height}
        then:
          - switch.turn_off: switch_down
      - above: ${max_height}
        then:
          - switch.turn_off: switch_up
```

これは裏を返すと、高さが取れていない状態で cover や number を動かすと止まらない、ということです。デスク側の物理リミットで止まるだけになります。Day 1 の自分がその状態で上を押していたわけで、いま思うと危なかったです。プリセットボタンは単発のコマンドでデスクが自走するので、高さに関係なく安全です。ダッシュボードには cover と一緒に座り・立ちのボタンを置いて、普段はそちらを使っています。

続けて Google Home と Assist に公開しましたが、ここで別の罠を踏みました。

「デスク座り」のように日本語で呼べるように、ESPHome 側の entity 名を日本語にしました。すると config validation が落ちます。ESPHome は entity の`name`から ASCII の`object_id`を作るので、日本語だけの名前は空になり、「座り」と「立ち」が両方`__`になって衝突していました。

じゃあ cover は`name: None`にして device の friendly_name(デスク)で表示させよう、としたら今度は`cover.tesuku`という entity が登録されました。friendly_name が object_id の生成に使われて、濁点の落ちたローマ字になっています。しかも ESPHome の unique_id は`<mac>-<platform>-<object_id>`なので、名前を変えた時点で HA は別 entity として登録し直し、付けたばかりの expose ラベルが消えました。

ESPHome 側の名前は ASCII で固定することにしました。日本語はダッシュボードのカード名と HA の alias で与えます。alias にしておけば Google Home からも「座り」「立ち」「昇降デスク」で通ります。

```yaml
cover:
  - platform: template
    id: desk_cover
    # name: None にすると unique_id が <mac>-cover-___ に変わり、
    # entity_id が cover.tesuku にローマ字化される。ASCII 固定にする
    name: Desk
    device_class: blind
```

## Day 4: Google Home に出てこない

expose ラベルを付けたのに Google Home にデスクが出てきません。Voice Assist はラベルを付けた直後から効くのに、[Matter Hub](https://github.com/t0bst4r/home-assistant-matter-hub) は起動時にしか filter を評価しないので、再起動が必要でした。新しい integration を公開するたびに当たる手順なので、HA 設定リポジトリの CLAUDE.md に書いて終わりにしました。

## いまの使い方

普段はダッシュボードの座り・立ちボタンです。あとは Google Home のルーティンに組み込んでいます。音声で立ちと言うこともできますが、ボタンを押すほうが多いです。

## 振り返り

ケーブルを切る方式を選んだ時点で、Day 1 の数時間は避けられなかったと思います。切るなら導通確認を先にやるべきでしたが、基板なら 8 本すべてがピンに出るので割り当ての試行錯誤もすぐ終わり、市販ケーブルをそのまま挿せて、抜けば純正構成に戻せます。最初から 1,299 円を払っておけばよかったです。
