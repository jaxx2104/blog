---
title: "OpenClaw から hermes agent へと移行した"
created_at: '2026-07-06T00:00:00.000Z'
updated_at: '2026-07-06T00:00:00.000Z'
path: /openclaw-to-hermes-agent
description: "NUC 常駐のパーソナル AI エージェントを OpenClaw から Hermes Agent (Nous Research) に乗り換えた。公式移行コマンド claw migrate、heartbeat と cron の設計差、文字数上限付きメモリ、モデル設定の自由度など、機能面の違いを中心にまとめる。"
category: 開発環境
tags:
  - openclaw
  - hermes-agent
  - llm
  - agent
---

自宅の NUC で常駐させているパーソナル AI エージェントを、[OpenClaw](https://github.com/openclaw/openclaw)から Nous Research の Hermes Agent に移行しました。Telegram と Slack の DM で話しかけると[Home Assistant](/home-assistant-setup-log-2026)を操作したり、定期タスクでブログのネタ出しをしてくれたりするエージェントです。きっかけはローカル LLM を primary にしたいというコスト側の事情でしたが、乗り換えてみると両者の設計の違いの方が面白かったので、この記事は機能面の差を中心にまとめます。

TL;DR:

- `hermes claw migrate`という公式の移行コマンドがあり、人格・記憶・モデル設定・MCP はほぼ自動で移った
- いちばん大きい機能差は定期タスク。heartbeat のポーリングと自前の時間窓判定が、cron 式スケジューラに置き換わった
- メモリは自由記述の Markdown から文字数上限付きの組み込みツールに変わった。上限満杯でターンが静かにハングする罠を初日に踏んだ
- モデル設定は Hermes の方が細かく効く。ただしローカル 8B の日本語品質が壁で、primary は OpenRouter のまま
- OpenClaw は停止のみで残してあり、2 週間の観察後に退役予定

## 移行前の構成

OpenClaw は 2026-06-14 から NUC (Intel N95/8GB) で動かしていました。systemd user service で常駐し、モデルは[OpenRouter](https://openrouter.ai/)の deepseek-v3.2、定期タスクは heartbeat で 4 本(週末のブログネタ出し・技術トレンド収集・メモリ蒸留・GitHub 活動ログ)。ワークスペースの Markdown はリポジトリで config-as-code 管理して、Claude Code で編集後に NUC へ rsync する運用です。[ESP-Claw を触ってみている](/esp-claw/)の記事で比較対象にしていたのが、この構成でした。

3 週間運用してみて正直コストがきつく、heartbeat の間隔を 30 分から 60 分に伸ばし、モデルを 2 回替え、朝のダイジェスト配信を廃止しています。ローカル LLM を主戦力にできれば話が早いのですが、OpenClaw のモデル設定は 1 本の文字列で、プロバイダの使い分けを細かく制御できません。そこで provider まわりの自由度が高い[Hermes Agent](https://hermes-agent.nousresearch.com/)を試すことにしました。

## hermes claw migrate で引っ越す

Hermes Agent には OpenClaw からの移行コマンドが公式に用意されています。移行スクリプト本体は skill として配布されているので、先にそれを入れてから実行します。

```bash
hermes skills install official/migration/openclaw-migration --yes
hermes claw migrate
```

これで人格 (SOUL.md)・ユーザープロフィール (USER.md)・長期記憶 (MEMORY.md)・日次メモリ・モデル設定・MCP サーバー定義が一括で移ります。嬉しい誤算だったのは自動要約で、220 行あった USER.md を Hermes 側の文字数上限(約 1,375 字)に合わせて勝手に圧縮してくれました。手動で削る作業を覚悟していたので、これは助かりました。

罠も 2 つ踏んでいます。1 つは secret の扱いで、migrate は OpenClaw の SecretRef を展開して Home Assistant の JWT を config.yaml に生値で焼き込みます。`~/.hermes/.env`に移して`Authorization: Bearer ${MCP_HOME_ASSISTANT_API_KEY}`の環境変数参照に書き換えました。もう 1 つはモデル指定の形式です。OpenClaw の`openrouter/deepseek/deepseek-v3.2`という 1 本の文字列がそのまま`model.default`に入り、"not a valid model ID" で 400 になります。Hermes は provider と model を分離する設計なので、手で直しました。

チャネルは Telegram bot と Slack app のトークンをそのまま流用できました。Hermes はトークンが存在するチャネルを自動で有効にする方式で、owner 限定にするには`TELEGRAM_ALLOWED_USERS`/`SLACK_ALLOWED_USERS`を置きます。切り替え自体は systemd のサービスを入れ替えるだけです。

## いちばんの機能差は定期タスク: heartbeat から cron へ

OpenClaw の定期タスクは heartbeat という仕組みでした。60 分ごとに HEARTBEAT.md をエージェントに読ませ、該当タスクがなければ`HEARTBEAT_OK`を返させるポーリング型です。この方式だと「いつ実行するか」の判定をタスク側のプロンプトに書く必要があります。実際の HEARTBEAT.md はこうなっていました。

```markdown
## 週末ドラフト(土曜に1回)

**実行条件:** 現地時刻(JST)が **土曜の 10:00〜10:59** で、かつ **今週まだ実行していない** ときだけ。
それ以外は何もせず `HEARTBEAT_OK`。

**重複防止:** `memory/heartbeat-state.json` の `weeklyDraftDate`(YYYY-MM-DD)を確認する。
今日の日付と一致していれば実行済み＝スキップ。実行したら今日の日付を書き込む。
```

時間窓の判定も重複防止の state ファイルも、LLM に読ませるプロンプトとして自前実装するわけです。窓を 1 時間に設計しておかないと 60 分間隔の tick から漏れる、といった暗黙の結合もあります。しかも該当タスクがない tick でも LLM は毎回起動するので、空振りにもトークンを払います。

Hermes は普通の cron でした。

```bash
hermes cron create "0 10 * * 6" "<タスクのプロンプト>" --name weekend-draft --deliver slack:<チャネル ID>
```

cron 式はシステムのタイムゾーン (JST) で解釈されるので、そのまま土曜 10:00 と書けます。時間窓判定と heartbeat-state.json は丸ごと消え、タスクがない時間に LLM が空回りすることもなくなりました。4 本のタスクは定義スクリプトごとリポジトリへ置き、冪等に再インストールできる形で管理しています。

cron 側にも罠はありました。cron エージェントの terminal ツールは POSIX シェル経由でコマンドを実行するので、URL 中の`&`をクォートせずに書くとバックグラウンド実行として解釈され、本体のリクエストが捨てられて出力が空になります。GitHub 活動ログのタスクがこれを踏んで、実際にはコミットがあるのに「過去 7 日の活動なし」と誤報しました。いまはプロンプト側で`gh api -f KEY=VALUE`の`&`を含まない形式を強制しています。

## メモリは自由記述から上限付き組み込みツールへ

OpenClaw のメモリはワークスペースの Markdown をエージェントが自由に読み書きする方式で、肥大化の管理は週次の蒸留タスクという運用でカバーしていました。Hermes は`memory`ツールが組み込みで、MEMORY.md にデフォルト約 2,200 字(USER.md は約 1,375 字)の上限があります。毎ターン context に注入される前提だから上限でトークンを抑える、という設計です。

この上限で初日に事故りました。Slack で URL を覚えておいてと頼んだところ、ターンが「⏳ Working — iteration 8/90」のまま 27 分固まったのです。NUC 側で見ると gateway プロセスはネットワーク待ちのまま止まっていて、SIGTERM にも応答せず SIGKILL で強制終了しました。原因は MEMORY.md が 2,169/2,200 字でほぼ満杯だったこと。`memory add`が上限で弾かれ続け、整理(consolidation)の失敗を重ねた末にターンごと止まっていました。

回避は設定 1 つです。

```bash
hermes config set memory.memory_char_limit 4400
```

上げた分だけ毎ターンのトークンは増えるのでトレードオフですが、満杯が「静かなハング」として現れる障害モードは知らないと診断できません。上限そのものを外したければ、外部メモリプロバイダ([honcho](https://github.com/plastic-labs/honcho)や[mem0](https://github.com/mem0ai/mem0))に差し替える口も用意されています。

書き味なら、個人的には OpenClaw の自由記述に分があると思います。ただ、あちらは際限なく太る問題を運用で抑えていたのに対し、Hermes は上限という形で設計に織り込んでいる。不便さの種類が違うだけで、真面目に向き合っているのは Hermes の方だと感じます。

## モデル設定は細かく効く、ただし実力は別問題

移行の動機だったモデルまわりは、期待どおり自由度が上がりました。provider と model が分離していて、custom provider で任意の OpenAI 互換エンドポイントに直結できます。Windows のゲーミング PC (RTX 5070Ti 16GB) で動かしている[Ollama](https://ollama.com/)をネットワーク越しに繋ぎました。

```bash
hermes config set model.provider custom
hermes config set model.base_url http://iwawin:11434/v1
hermes config set model.default hermes3-64k:8b
```

Ollama の OpenAI 互換 API は num_ctx をリクエストで受けないので、`/api/create`で num_ctx 65536 を焼き込んだ派生モデルを作って対処します。8B の Q4 量子化なら 64k コンテキストでも VRAM 13.1GB で、16GB に収まりました。

主モデル以外の振り分けもあります。Hermes には auxiliary client という補助タスク用のルーターがあり、vision・要約圧縮・コマンドの自動承認・タイトル生成など 10 種類のタスクを主モデルと別のプロバイダに振れます。OpenClaw では全部が 1 本のモデル設定に乗っていたので、ここは明確に細かい。ただしデフォルトの`provider: auto`は未ログインの Nous Portal を毎ターン探しに行ってログを警告で埋めるので、全部 OpenRouter に固定しました。複数モデルの回答を束ねる MoA という仕組みもありますが、出荷時プリセットが gpt-5.5 と Opus を参照する高コスト構成だったので、うっかり発火させる前に安価な構成へ差し替えています。

肝心のローカル primary 化は、設定ではなくモデルの実力で崩れました。hermes3:8b (Q4) に人格と記憶を注入して日本語で自己紹介させたら、オーナーを認識せず「お三品かもしれませんが」のような非文が返ってきます。system prompt は正しく渡っていることを確認したので、これは 8B 量子化モデルの日本語の実力です。Hermes はモデルに 64K コンテキストを要求するため、16GB VRAM で載る 14B 級も選択肢から落ち、結局 primary は OpenRouter の deepseek-v3.2 のまま。ローカルの Ollama は fallback に回しました。設定の自由度が上がっても、日本語で常用できるローカルモデルがないと絵に描いた餅です。

## そのほかの違い

書き切れなかった差分を並べておきます。

| 軸 | OpenClaw | Hermes Agent |
| --- | --- | --- |
| 定期タスク | heartbeat(ポーリング + 自前の時間窓判定) | cron 式スケジューラ |
| メモリ | 自由記述の Markdown | 文字数上限付き組み込みツール + 外部プロバイダ |
| モデル設定 | 1 本の文字列 | provider 分離・custom endpoint・auxiliary の別プロバイダ振り分け |
| skill 配布 | なし(ワークスペースに自前で書く) | official カタログ約 100 個 + インストール時セキュリティスキャン |
| Web UI | tailnet ゲートのみ(パスワード無しで公開できた) | 非 loopback では basic 認証が強制 |
| サンドボックス | 非 main セッションを Docker で隔離 | cron も main context で実行(コマンド承認で制御) |

Web UI の認証強制はひと手間増えますが、`--insecure`フラグすら no-op 化されていて、逃げ道を残さない方針が徹底しています。逆にサンドボックスは OpenClaw の方が手厚く、Hermes では実行コマンドの承認ポリシーで縛る方式になります。

## OpenClaw はまだ消さない

移行はカットオーバー済みですが、OpenClaw は停止しただけで`~/.openclaw`ごと残してあります。チャネルのトークンを共有しているので、systemd のサービスを入れ替えれば数分でロールバックできる状態です。cron 4 本が 2 週連続で定時配信に成功する、fallback の実績が 1 回以上ある、といった退役条件をチェックリストにして、満たしたら片付けます。

機能面だけ見れば、定期タスクの cron 化とメモリ上限の設計だけでも移行した甲斐がありました。当初の目的だったローカル LLM の primary 化は宿題として残っているので、16GB VRAM で日本語が実用になる 64k コンテキストのモデルが出てきたら、また構成を見直すつもりです。
