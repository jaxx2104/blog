---
title: Home Assistant セットアップログ
created_at: '2025-09-10T16:38:06.000Z'
updated_at: '2026-06-06T00:00:00.000Z'
path: /home-assistant-setup-log
category: Scrapbox
tags:
  - imported
  - scrapbox
---
2025-09 に書いたセットアップログを、2026-06 時点の構成で全面的に書き直しました。

TL;DR:

- 一番大きい変化は `/config` を git 管理にして Claude Code で運用するようになったこと
- 設定の方針は「判断は設定時に寄せて、実行時は決定論的なルールで固める」
- 明るさ・色温度の制御は automation から Adaptive Lighting に委譲した

## ハードウェア

Beelink EQ14 (Intel N100 / 16GB / 500GB NVMe) に Home Assistant OS を載せています。ここは初期から変わらず。静かで安定していて不満がないです。

https://www.amazon.co.jp/dp/B0D5XNYVHN

## 構成管理: /config を git ミラーにした

ここが今の運用の中心です。HA の `/config` をまるごと private リポジトリのミラーにして、手元で編集 → push、HA 側が pull → reload、というフローにしています。

- 編集は手元の [Claude Code](https://claude.com/claude-code) でやる。`/deploy` skill が push から `ha core check`、変更ファイルに応じた reload 判定までやってくれる
- HA UI 側で変更した分は、毎日 23:30 と HA 再起動前に automation が自動 commit & push してリポジトリに取り込む
- secrets.yaml と実行時状態 (.storage, DB, ログ) は .gitignore で除外

ハマりどころ: HA 側の pull は `git pull --ff-only` だと PR を squash merge したときに non fast-forward で失敗します。`git fetch + git reset --hard origin/main` にしました。

## packages 分割

configuration.yaml には glue だけ残して、機能別の YAML は `packages/` に分けました。

```yaml
homeassistant:
  packages: !include_dir_named packages
```

- 1 機能 1 ファイル (`automation_presence.yaml`、`climate_eolia.yaml` など)
- 書き方の規約はリポジトリの CLAUDE.md に書いて、エージェントに守らせる
  - `time_pattern` での polling は禁止。`state` trigger + `for:` で push 化して、HA 再起動時は `homeassistant.event: start` trigger で現在状態を再評価する
  - `device_id` 直接参照を避けて entity_id を使う。デバイスを再ペアリングすると id が変わって壊れるため
  - `alias` は日本語、`description` は英語 1 行で「なぜ存在するか」を書く

## entity_id の日本語問題

一番のハマりどころでした。HA は日本語名から entity_id を生成するとき、漢字を中国語ピンインに変換します。「リビングのテレビ」が `switch.rihinkunoterehi` になる。

- 放置していたら 194 件たまっていたので、WebSocket API でまとめて rename した
- area slug も `shu_zhai` (書斎) みたいなピンインになっていたので 9 部屋を英語化
- 今の方針: entity_id と area slug は英語 snake_case、friendly_name は日本語

## デバイス構成

[ESPHome](https://esphome.io/) は 3 台です。

M5Stack Atom Echo は音声アシスタント。[micro_wake_word](https://esphome.io/components/micro_wake_word/) で wake word 検出をデバイス側に載せました。応答した音声は Atom Echo の小さいスピーカーだけだと聞き取りづらいので、書斎の Google Cast にもミラー再生しています。micro_wake_word を回し続けるので内部温度は常時 90°C 前後あって、共通の diagnostics package で温度と WiFi 強度を出し、100°C 超えで通知する automation を入れました。

M5Stack ATOM S3 Lite は書斎と寝室の 2 台で、Bluetooth Proxy 役。同型機は `name_add_mac_suffix: true` で hostname を MAC で一意化して、yaml の name は共通化しています。

その他のデバイス。

- [Zigbee2MQTT](https://www.zigbee2mqtt.io/): Zigbee デバイスのハブ。設定も git 管理しているが、`!secret` はダブルクォート必須 (`"!secret mqtt_password"`) という罠がある。クォートなしだと addon が起動しない
- SwitchBot のシーリングライトは Hub 経由の Cloud をやめて BLE 直結 (Pro) にした。レイテンシと API 制限回避のため
- エアコンは ECHONET Lite と Panasonic Eolia (クラウド) の併用
- テレビ (LG webOS) は画面が消えると webostv からは電源オンできないので、wake_on_lan switch を噛ませている

## 照明は Adaptive Lighting に委譲

以前は時刻 automation ごとに brightness と color_temp を書いていましたが、[HACS](https://hacs.xyz/) の [Adaptive Lighting](https://github.com/basnijholt/adaptive-lighting) に置き換えました。

- automation は on/off だけ。明るさと色温度は太陽の位置に追従して AL が連続調整する
- 就寝モードは 1900K まで落とす。22:00–07:00 を時刻 automation で切り替え
- SwitchBot Pro は BLE 直結なのでコマンド連投で取りこぼす。`send_split_delay: 200` と `skip_redundant_commands: true` で負荷を抑えた

## エアコンの夜間自動制御

寝室の温湿度計を見て 21:00–06:00 だけ動くルールにしています。

- 28°C 超 + 湿度 65% 未満 → 冷房 26°C
- 28°C 超 + 湿度 65% 以上 → ドライ 27°C
- 26.5°C 未満 → ドライ 28°C
- 季節外は automation を entity registry で disable しておく。yaml を消さなくても disable 状態は維持される

## 公開対象は expose ラベルで一元管理

Matter Bridge と音声アシスタントへの公開対象が増えるままになっていたので、HA のラベル機能で opt-in 管理に変えました。

- `expose` ラベルを付けた entity だけを Matter / Voice に公開する
- Matter 公開数は 221 → 51 になった。tailscale や battery sensor みたいなノイズ、SwitchBot の Cloud と BLE の二重登録が大半だった

## リモートアクセス

- [Tailscale](https://tailscale.com/)。ポート開放なしで外から HA に届く
- ローカルからの SSH も Tailscale の MagicDNS 経由。LAN や mDNS の状態に依存しない

## まとめ

1 年運用して、自分はスマートホームに必要なのは賢さより外さなさだと思っています。判断を設定時に寄せて実行時は決定論的ルールで固める方式は、速くて外さない。git 管理と Claude Code の運用とも相性がいいです。設定ファイルと規約 (CLAUDE.md) をリポジトリに揃えておけば、「こういう automation 足して」で済むようになりました。
