---
title: Home Assistant セットアップログ 2026
created_at: '2026-06-06T00:00:00.000Z'
updated_at: '2026-06-06T00:00:00.000Z'
path: /home-assistant-setup-log-2026
category: 開発環境
tags:
  - homeassistant
  - smarthome
---
[2025-09 のセットアップログ](/home-assistant-setup-log)から構成が大きく変わったので、2026-06 時点の構成を別エントリーとしてまとめました。

TL;DR:

- 一番大きい変化は `/config` を git 管理にして Claude Code で運用するようになったこと
- 設定の方針は「判断は設定時に寄せて、実行時は決定論的なルールで固める」
- 明るさ・色温度の制御は automation から Adaptive Lighting に委譲した

## ハードウェア

Beelink EQ14 (Intel N100 / 16GB / 500GB NVMe) に [Home Assistant OS](https://www.home-assistant.io/installation/) を載せています。ここは初期から変わらず。静かで安定していて不満がないです。

https://www.amazon.co.jp/dp/B0D5XNYVHN

## 構成管理: /config を git ミラーにした

ここが今の運用の中心です。HA の `/config` をまるごと private リポジトリのミラーにして、手元で編集 → push、HA 側が pull → reload、というフローにしています。

- 編集は手元の [Claude Code](https://claude.com/claude-code) でやる。`/deploy` skill が push から `ha core check`、変更ファイルに応じた reload 判定までやってくれる
- HA UI 側で変更した分は、毎日 23:30 と HA 再起動前に automation が自動 commit & push してリポジトリに取り込む
- secrets.yaml と実行時状態 (.storage, DB, ログ) は .gitignore で除外

リポジトリの CLAUDE.md には絶対ルールを置いて、エージェントと人間の両方に守らせています。

> 1. **平文認証情報禁止** — 認証情報は `secrets.yaml` に置き、参照は `!secret <key>`
> 2. **`secrets.yaml` の commit 禁止** — `.gitignore` で除外済み
> 3. **公開対象は `expose` ラベルで opt-in 一元管理**
> 4. HA UI で設定を変更したら、後で git に取り込む

UI 側の取り込みは `shell_command` + automation の素朴な作りです。

```yaml
shell_command:
  push_to_github: bash /config/tools/ha-gitpush.sh

automation:
  - id: 'github_backup_daily'
    alias: 'バックアップ: 23:30 GitHub 毎日プッシュ'
    description: 'Push /config to GitHub every night at 23:30 to keep the mirror current.'
    triggers:
      - trigger: time
        at: '23:30:00'
    actions:
      - action: shell_command.push_to_github
```

ハマりどころ: HA 側の pull は `git pull --ff-only` だと PR を squash merge したときに non fast-forward で失敗します。fetch + reset にしました。

```bash
ssh homeassistant "cd /config && git fetch origin && git reset --hard origin/main"
```

## packages 分割

configuration.yaml には glue だけ残して、機能別の YAML は `packages/` に分けました。

```yaml
homeassistant:
  packages: !include_dir_named packages
```

- 1 機能 1 ファイル (`automation_presence.yaml`、`climate_eolia.yaml` など)
- 書き方の規約はリポジトリの CLAUDE.md に書いて、エージェントに守らせる。一度書いておけば勝手に守ってくれるので、規約を文章化するコストはすぐ回収できた
  - `time_pattern` での polling は禁止。`state` trigger + `for:` で push 化して、HA 再起動時は `homeassistant.event: start` trigger で現在状態を再評価する
  - `device_id` 直接参照を避けて entity_id を使う。デバイスを再ペアリングすると id が変わって壊れるため
  - `alias` は日本語、`description` は英語 1 行で「なぜ存在するか」を書く

規約に沿った automation はこういう形になります。書斎の在席検知の例。

```yaml
automation:
  - id: '1759584240638'
    alias: '書斎: 在席で演出 / 離席で AL 復帰'
    description: 'Unify study tape bias-light scene + Pixoo on/off into one entry.'
    triggers:
      - trigger: state
        entity_id: binary_sensor.study_presence
        to: 'on'
        for: '00:00:05'   # ON は即応
        id: seated
      - trigger: state
        entity_id: binary_sensor.study_presence
        to: 'off'
        for: '00:01:30'   # OFF は長め (読書中の静止で消えないように)
        id: left
      - trigger: homeassistant
        event: start      # HA 再起動時に現在状態を再評価
        id: start
```

## Claude Code 側の設定

リポジトリには HA の設定だけでなく、エージェント向けの設定も一緒に入れています。

- CLAUDE.md はルートだけでなく `packages/` `esphome/` `zigbee2mqtt/` の各ディレクトリにも置いて、その階層の規約 (命名・記法・reload 方法・踏んだ罠) を書く。エージェントは触るディレクトリの CLAUDE.md を読んでから作業する
- 定型作業は `.claude/skills/` に skill (Markdown の手順書) として置く
  - `/deploy` — commit → push → HA 側 fetch + reset → `ha core check` → 変更ファイルから reload 種別を判定して反映
  - `/add-automation` —「○○したら△△して」の要望から automation YAML を生成して `/deploy` まで回す
  - `/triage` — 動かないときにログとエンティティ状態から原因を切り分ける
- [Home Assistant の MCP server](https://www.home-assistant.io/integrations/mcp_server/) も繋いであって、エージェントが entity の現在状態を直接読める。`/add-automation` は YAML を書く前に対象 entity の実在を MCP で確認するので、存在しない entity を参照する事故が起きない

「こういう automation 足して」と言うだけで済む状態の実体は、この CLAUDE.md + skill + MCP の 3 点セットです。

## entity_id の日本語問題

一番のハマりどころでした。HA は日本語名から entity_id を生成するとき、漢字を中国語ピンインに変換します。

```yaml
# これの entity_id は switch.rihinkunoterehi になる
switch:
  - platform: wake_on_lan
    name: リビングのテレビ
```

- 放置していたら 194 件たまっていたので、WebSocket API でまとめて rename した
- area slug も `shu_zhai` (書斎) みたいなピンインになっていたので 9 部屋を英語化
- 今の方針: entity_id と area slug は英語 snake_case、friendly_name は日本語

## デバイス構成

[ESPHome](https://esphome.io/) は 3 台です。

[M5Stack Atom Echo](https://www.switch-science.com/products/6347) は音声アシスタント。[micro_wake_word](https://esphome.io/components/micro_wake_word/) で wake word 検出をデバイス側に載せました。応答した音声は Atom Echo の小さいスピーカーだけだと聞き取りづらいので、TTS 終了イベントで書斎の Google Cast にもミラー再生しています。

```yaml
voice_assistant:
  on_tts_end:
    # atom-echo の小型スピーカーでは聞き取りづらいため Cast 側でも鳴らす
    - homeassistant.service:
        service: media_player.play_media
        data:
          entity_id: media_player.study_cast
          media_content_id: !lambda 'return x;'
          media_content_type: music
          announce: "true"
```

micro_wake_word を回し続けるので内部温度は常時 90°C 前後あって、共通の diagnostics package で温度と WiFi 強度を出し、100°C 超えで通知する automation を入れました。

[M5Stack ATOMS3 Lite](https://www.switch-science.com/products/8778) は書斎と寝室の 2 台で、Bluetooth Proxy 役。設定はほぼこれだけで動きます。

```yaml
esphome:
  name: m5stack-atom3-lite
  friendly_name: M5Stack Atom3 Lite
  name_add_mac_suffix: true  # 同型機の hostname を MAC で一意化

esp32:
  board: esp32-s3-devkitc-1
  framework:
    type: esp-idf

esp32_ble_tracker:
  scan_parameters:
    active: true

bluetooth_proxy:
  active: true
```

その他のデバイス。

- [Zigbee2MQTT](https://www.zigbee2mqtt.io/): Zigbee デバイスのハブ
- [SwitchBot](https://www.home-assistant.io/integrations/switchbot/): シーリングライトは Hub 経由の Cloud をやめて BLE 直結 (Pro) にした。レイテンシと API 制限回避のため
- エアコン: [ECHONET Lite](https://github.com/scottyphillips/echonetlite_homeassistant) と [Panasonic Eolia](https://github.com/avolmensky/panasonic_eolia) (クラウド) の併用
- テレビ (LG webOS): 画面が消えると [webostv](https://www.home-assistant.io/integrations/webostv/) からは電源オンできないので、wake_on_lan switch を噛ませている

Zigbee2MQTT は設定も git 管理していますが、`!secret` はダブルクォート必須という罠があります。Z2M の `!secret` は YAML タグではなく正規表現ベースの文字列パースなので、クォートなしだと js-yaml が未知タグ扱いで例外を出して addon が起動しません。

```yaml
# OK
password: "!secret mqtt_password"
# NG (addon が起動しない)
password: !secret mqtt_password
```

## 照明は Adaptive Lighting に委譲

以前は時刻 automation ごとに brightness と color_temp を書いていましたが、[HACS](https://hacs.xyz/) の [Adaptive Lighting](https://github.com/basnijholt/adaptive-lighting) に置き換えました。

- automation は on/off だけ。明るさと色温度は太陽の位置に追従して AL が連続調整する
- 就寝モードは 1900K まで落とす。22:00–07:00 を時刻 automation で切り替え
- SwitchBot Pro は BLE 直結なのでコマンド連投で取りこぼす。`send_split_delay` と `skip_redundant_commands` で負荷を抑えた

```yaml
adaptive_lighting:
  - name: living
    min_color_temp: 2200
    max_color_temp: 5500
    transition: 45
    interval: 90
    separate_turn_on_commands: true
    send_split_delay: 200          # BLE 取りこぼし対策 (ms)
    skip_redundant_commands: true  # 同値なら送信スキップ
    take_over_control: true
    sleep_color_temp: 1900         # メラトニン抑制を避ける暖色寄り
    sleep_transition: 60
    transition_until_sleep: true   # 太陽追従値から sleep 値へ連続的に遷移
    lights:
      - light.ceiling_light_pro_living
```

## エアコンの夜間自動制御

寝室の温湿度計を見て 21:00–06:00 だけ動くルールにしています。

- 28°C 超 + 湿度 65% 未満 → 冷房 26°C
- 28°C 超 + 湿度 65% 以上 → ドライ 27°C
- 26.5°C 未満 → ドライ 28°C
- 季節外は automation を entity registry で disable しておく。yaml を消さなくても disable 状態は維持される

## 公開対象は expose ラベルで一元管理

[Matter](https://www.home-assistant.io/integrations/matter/) Bridge と音声アシスタントへの公開対象が増えるままになっていたので、HA のラベル機能で opt-in 管理に変えました。

- `expose` ラベルを付けた entity だけを Matter / Voice に公開する
- Matter 公開数は 221 → 51 になった。tailscale や battery sensor みたいなノイズ、SwitchBot の Cloud と BLE の二重登録が大半だった

Apple Home 側の一覧がスッキリしたのと、音声アシスタントが変な entity を拾う誤爆も減った気がします。

## リモートアクセス

[Tailscale](https://tailscale.com/) です。ポート開放なしで外から HA に届くので、外部公開まわりは何も考えなくてよくなりました。ローカルからの SSH も Tailscale の MagicDNS 経由にしてあって、LAN や mDNS の状態に依存しないのが地味に効いています。

## まとめ

1 年運用して、自分はスマートホームに必要なのは賢さより外さなさだと思っています。判断を設定時に寄せて実行時は決定論的ルールで固める方式は、速くて外さない。git 管理と Claude Code の運用とも相性がいいです。設定ファイルと規約 (CLAUDE.md) をリポジトリに揃えておけば、「こういう automation 足して」で済むようになりました。
