---
title: Home Assistant セットアップログ
created_at: '2025-09-10T16:38:06.000Z'
updated_at: '2025-09-10T16:40:03.000Z'
path: /home-assistant-setup-log
category: Scrapbox
tags:
  - imported
  - scrapbox
---
はじめに
2025 年のスマートホーム環境を構築するにあたり、Home Assistant を選択しました。選定理由は以下の通りです：
- オープンソース：コミュニティが活発で、カスタマイズ性が高い
- 日本の家電対応：ECHONET Lite 対応により、国内メーカーの家電を制御可能
- ローカル制御：クラウド依存を最小限に抑え、プライバシーとレスポンスを重視
- 拡張性：ESPHome による自作デバイスの追加が容易

実現したかったこと：
1. 音声での家電制御（日本語対応）
2. 自動化による快適な生活環境
3. 外出先からの安全なアクセス
4. 既存家電の活用

基本セットアップ

インストール環境
- バージョン: Home Assistant Core 2025.8.3
- Supervisor: 2025.09.0
- インストール方法: Home Assistant OS（推奨）
- ハードウェア: Beelink EQ14

ミニ PC: Beelink EQ14
Home Assistant OS をインストールするマシンとして、省電力性と静音性に優れたミニ PC「Beelink EQ14」を選択しました。
- CPU: Intel N100 (4 コア/4 スレッド, 最大 3.4GHz)
- メモリ: 16GB DDR4
- ストレージ: 500GB M.2 NVMe SSD
- ネットワーク: 2.5Gbps Ethernet ポート x2, Wi-Fi 6
- 特徴: 低消費電力でありながら、Home Assistant および多数のアドオンを快適に動作させるのに十分な性能を持っています。ファンレス設計に近く、非常に静かです。

初期設定のポイント
基本設定ファイル（`configuration.yaml`）の構成：

```yaml
# デフォルト統合の読み込み
default_config:

# フロントエンドテーマの設定
frontend:
  themes: !include_dir_merge_named themes

# 設定ファイルの分割管理
automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml
```

バックアップ戦略
定期的なバックアップは必須です。今回のバックアップ構成：
タイプ: 部分バックアップ（データベース含む）
頻度: 週次自動バックアップ
保存先: ローカル＋外部ストレージ

必須アドオンの導入

HACS (Home Assistant Community Store)
HACS は、Home Assistant の公式ストアでは提供されていないコミュニティ製のカスタムコンポーネントを管理するストアです。統合、カード、テーマなどを追加でき、機能を拡張できます。ただし非公式なコンポーネントのため利用は自己責任です。
```bash
# Get HACSアドオンのインストール
# バージョン: 1.3.1
```

File editor
設定ファイルの編集に必須のアドオンです。
バージョン: 5.8.0
VSCode 風のエディタで YAML 編集が快適

Tailscale VPN
Tailscale は、複雑な設定なしで、デバイス間に安全なプライベートネットワークを構築する VPN サービスです。WireGuard プロトコルをベースにしており、ポート開放をすることなく、外出先から自宅の Home Assistant へ安全にアクセスできます。
バージョン: 0.25.0
ポート開放不要で安全な接続を実現
設定は非常にシンプル

ESPHome でのデバイス構築

ESPHome の基本
ESPHome は、ESP32 や ESP8266 を使って YAML 形式の設定ファイルでカスタムスマートデバイスを作成できるフレームワークです。プログラミング知識不要で、Home Assistant との連携もスムーズです。OTA（無線）でのアップデートも可能です。
ESPHome アドオン（v2025.8.3）により、ESP32/ESP8266 デバイスを簡単に Home Assistant に統合できます。
基本的な YAML 構成：
```yaml
esphome:
  name: device-name
  friendly_name: Device Friendly Name

esp32:
  board: esp32-board-type
  framework:
    type: esp-idf

# ログ出力
logger:

# Home Assistant API
api:
  encryption:
    key: "暗号化キー"

# OTAアップデート
ota:
  - platform: esphome
    password: "OTAパスワード"

# WiFi設定
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
```

M5Stack ATOM3 Lite（Bluetooth Proxy）
Bluetooth 対応デバイスを Home Assistant に接続するための Proxy として構築しました。

製品スペック
- MCU: ESP32-S3FN8 (デュアルコア, 最大 240MHz)
- Wi-Fi: 2.4GHz
- Bluetooth: 5.0 (BLE + Mesh)
- Flash: 8MB
- 特徴: 小型ながら強力な ESP32-S3 を搭載し、Bluetooth プロキシとして安定した動作が期待できます。

```yaml
esphome:
  name: m5stack-atom3-lite
  friendly_name: M5Stack Atom3 Lite

esp32:
  board: esp32-s3-devkitc-1
  framework:
    type: esp-idf

# Bluetooth Proxy設定
esp32_ble_tracker:
  scan_parameters:
    interval: 1100ms
    window: 1100ms
    active: true

bluetooth_proxy:
  active: true
  connection_slots: 3  # 同時接続数

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  
  # WiFi接続失敗時のフォールバック
  ap:
    ssid: "M5Stack-Atom3-Lite"
    password: "JXL6mq9J6ulb"

captive_portal:
```
ポイント：
ESP32-S3 を使用することで、より多くの BLE デバイスに対応
`active: true`でアクティブスキャンを有効化
3 台まで同時接続可能

M5Stack Atom Echo（音声アシスタント）
音声アシスタント機能を持つスマートスピーカーとして構築しました。

製品スペック
- MCU: ESP32-PICO-D4 (デュアルコア, 240MHz)
- Wi-Fi: 2.4GHz
- マイク: SPM1423 (PDM)
- スピーカー: 0.5W
- 特徴: マイクとスピーカーを内蔵した超小型の ESP32 開発ボード。Home Assistant の音声アシスタントを安価に構築するのに最適です。

```yaml
esphome:
  name: m5stack-atom-echo
  friendly_name: M5Stack Atom Echo
  project:
    name: m5stack.atom-echo-voice-assistant
    version: "24.7.24"

esp32:
  board: m5stack-atom
  framework:
    type: esp-idf

# I2S音声バス設定
i2s_audio:
  - id: i2s_audio_bus
    i2s_lrclk_pin: GPIO33
    i2s_bclk_pin: GPIO19

# マイク設定
microphone:
  - platform: i2s_audio
    id: echo_microphone
    i2s_din_pin: GPIO23
    adc_type: external
    pdm: true

# スピーカー設定
speaker:
  - platform: i2s_audio
    id: echo_speaker
    i2s_dout_pin: GPIO22
    dac_type: external
    channel: mono

# 音声アシスタント設定
voice_assistant:
  id: va
  microphone: echo_microphone
  speaker: echo_speaker
  noise_suppression_level: 2
  auto_gain: 31dBFS
  volume_multiplier: 2.0
  
  # 状態に応じたLED制御
  on_listening:
    - light.turn_on:
        id: led
        blue: 100%
        effect: "Slow Pulse"
  
  on_error:
    - light.turn_on:
        id: led
        red: 100%
        effect: none

# RGB LED設定
light:
  - platform: esp32_rmt_led_strip
    id: led
    pin: GPIO27
    chipset: SK6812
    num_leds: 1
    rgb_order: grb
    effects:
      - pulse:
          name: "Slow Pulse"
          transition_length: 250ms
      - pulse:
          name: "Fast Pulse"
          transition_length: 100ms

# Wake Word設定
switch:
  - platform: template
    name: Use wake word
    id: use_wake_word
    optimistic: true
    restore_mode: RESTORE_DEFAULT_ON
```
実装のポイント：
- I2S 接続でマイクとスピーカーを制御
- ノイズ抑制レベル 2 で環境音をカット
- LED で動作状態を視覚的に表示
- Wake Word 対応で「OK Nabu」で起動

日本の家電制御

ECHONET Lite カスタムコンポーネント
日本の家電制御規格である ECHONET Lite に対応するため、カスタムコンポーネントを導入しました。
対応メーカー例：
- Panasonic
- 三菱電機
- ダイキン
- 日立
- Nichicon（蓄電池）

Panasonic Eolia エアコンの連携
```yaml
climate:
  - platform: panasonic_eolia
    username: !secret panasonic_username
    password: !secret panasonic_password
```
クラウド経由で Panasonic のエアコンを制御できます。

Matter 対応

Matter Server アドオン
将来性を考慮して Matter 対応を準備しました。
バージョン: 8.1.0
Apple HomeKit、Google Home、Alexa との相互運用性
Thread 対応デバイスのサポート

音声アシスタント機能の実装

Piper（音声合成）
日本語の自然な音声合成を実現：
バージョン: 1.6.4
ローカルで動作するため、レスポンスが高速
日本語音声モデルの選択が可能

Speech-to-Phrase（音声認識）
音声コマンドの認識：
バージョン: 1.4.1
ローカル処理でプライバシー保護
カスタムフレーズの登録が可能

統合設定
M5Stack Atom Echo と組み合わせて、完全な音声アシスタントシステムを構築しました。

自動化の実装例

日の入り連動の照明・カーテン制御
```yaml
- id: '1755425045251'
  alias: 日の入り
  description: ''
  triggers:
  - trigger: sun
    event: sunset
    offset: 0
  conditions: []
  actions:
  - device_id: カーテンデバイスID
    domain: cover
    type: close
  - action: light.turn_on
    data:
      brightness_pct: 100
      transition: 300  # 5分かけて明るくする
      color_temp_kelvin: 3061  # 暖色系
    target:
      area_id:
      - リビング
      - 寝室
```

時間帯による照明の明るさ調整
```yaml
- id: '1755707359777'
  alias: '23:00 就寝準備'
  triggers:
  - trigger: time
    at: '23:00:00'
  actions:
  - action: light.turn_on
    data:
      brightness_pct: 20  # 20%に調光
      color_temp_kelvin: 3019  # より暖色に
      transition: 300  # 5分かけて変化
    target:
      area_id:
      - リビング
      - 寝室
```
自動化のコツ：
`transition`を使って急激な変化を避ける
エリア単位の制御により管理を簡素化
時間帯に応じて色温度も調整

UI カスタマイズ

Lovelace ダッシュボードの構成
カスタムカードを活用して見やすい UI を構築：

Xiaomi 掃除機カード
```yaml
type: custom:xiaomi-vacuum-map-card
entity: vacuum.xiaomi_vacuum
map_camera: camera.xiaomi_cloud_map
```
リアルタイムで掃除の進捗を可視化できます。

Better Thermostat カード
```yaml
type: custom:better-thermostat-ui-card
entity: climate.living_room
```
温度調整を直感的に操作できる UI を提供します。

エリア（部屋）の設定
部屋ごとにデバイスをグループ化：
リビング
寝室
書斎
エリア単位での一括制御が可能になります。

セキュリティとメンテナンス

secrets.yaml の活用
機密情報は`secrets.yaml`で一元管理：
```yaml
# secrets.yaml
wifi_ssid: "YourWiFiSSID"
wifi_password: "YourWiFiPassword"
panasonic_username: "your_email@example.com"
panasonic_password: "your_password"
```
設定ファイルでは`!secret`で参照：
```yaml
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
```

定期バックアップ
自動バックアップの設定：
1. Supervisor → バックアップ
2. 自動バックアップを有効化
3. 保持期間を設定（推奨：30 日）

アップデート戦略
メジャーアップデート：1 ヶ月待って安定性を確認
マイナーアップデート：1 週間待つ
セキュリティアップデート：即座に適用

トラブルシューティング

ESPHome デバイスの接続問題
症状：デバイスがオフラインになる
解決策：
1. WiFi 信号強度を確認（-70dBm 以上推奨）
2. 固定 IP アドレスの割り当て
3. mDNS の無効化と再有効化

音声認識の精度向上
改善方法：
1. ノイズ抑制レベルの調整（1-4）
2. マイクゲインの最適化
3. Wake Word の感度調整

よくある問題
1. 自動化が動作しない
- トリガー条件の確認
- エンティティ ID の正確性
- ログでエラーを確認
2. 統合が失敗する
- API キーの有効性
- ネットワーク接続
- バージョン互換性

まとめと今後の展望

実現できたこと
- 音声による家電制御（日本語対応）
- 自動化による快適な生活環境
- 外出先からの安全なアクセス（Tailscale）
- 既存家電の統合（ECHONET Lite、Panasonic Eolia）
- Bluetooth 機器の統合（M5Stack ATOM3 Lite）

今後追加したい機能
1. エネルギー管理
- 太陽光発電との連携
- 蓄電池の最適制御
- 電力使用量の可視化
2. セキュリティ強化
- 監視カメラの統合
- 人感センサーによる防犯システム
- 異常検知の通知
3. AI による高度な自動化
- 生活パターンの学習
- 予測制御の実装
- ChatGPT 統合による自然言語制御

コミュニティの活用
- Home Assistant の最大の強みはコミュニティです：
- 公式フォーラム: https://community.home-assistant.io/
- 日本語コミュニティ: Discord、Facebook groups
- HACS: 3000 以上のカスタムコンポーネント
- 継続的な改善と新機能の追加により、より快適なスマートホーム環境を構築していきます。

このセットアップログが、これから Home Assistant を始める方の参考になれば幸いです。質問やフィードバックはお気軽にコメントください。
