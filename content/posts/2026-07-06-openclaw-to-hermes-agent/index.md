---
title: "OpenClaw から Hermes Agent へと移行した"
created_at: '2026-07-06T00:00:00.000Z'
updated_at: '2026-07-11T00:00:00.000Z'
path: /openclaw-to-hermes-agent
description: "NUC 常駐のパーソナル AI エージェントを OpenClaw から Hermes Agent (Nous Research) に乗り換えた。いちばん効いたのは heartbeat が cron に置き換わって定期タスクが安定したこと。みんなが目玉と褒めるスキル自動生成は、気づけば勝手に育っていた。"
category: 開発環境
tags:
  - openclaw
  - hermes-agent
  - llm
  - agent
---

自宅の NUC で常駐させているパーソナル AI エージェントを、[OpenClaw](https://github.com/openclaw/openclaw)から Nous Research の[Hermes Agent](https://hermes-agent.nousresearch.com/)に移行しました。Telegram と Slack の DM で話しかけると[Home Assistant](/home-assistant-setup-log-2026)を操作したり、定期タスクでブログのネタ出しをしてくれたりするエージェントです。移行の動機は単純です。話題になっていたので機能を比べて、試したくなった。

TL;DR:

- 移行していちばん効いたのは定期タスクの安定。heartbeat のポーリングと時間窓判定が cron 式スケジューラに置き換わり、自前実装がごっそり消えた
- `hermes claw migrate`という公式の移行コマンドがあり、人格・記憶・モデル設定・MCP はほぼ自動で移った。ただし罠が 2 つ
- メモリは文字数上限付きに変わり、上限満杯でターンが静かにハングする罠を初日に踏んだ
- みんなが目玉と褒めるスキル自動生成は、気づいたら local skill 6 個とメモリ 30 個を溜めていた
- 出戻りはたぶん無い

## きっかけは話題性、決め手は機能比較

Hermes Agent が話題になっていたので、OpenClaw と機能を比べてみたのが始まりです。惹かれたのは定期タスクと skill まわりでした。

| 軸 | OpenClaw | Hermes Agent |
| --- | --- | --- |
| 定期タスク | heartbeat(ポーリング + 自前の時間窓判定) | cron 式スケジューラ |
| メモリ | 自由記述の Markdown | 文字数上限付き組み込みツール + 外部プロバイダ |
| モデル設定 | 1 本の文字列 | provider 分離・custom endpoint |
| skill 配布 | なし(ワークスペースに自前で書く) | official カタログ約 100 個 + スキル自動生成 |

両者の設計思想の比較は[laiso さんの記事](https://blog.lai.so/hermes-agent/)が詳しいです。この記事は移行して自分の運用がどう変わったかの備忘録です。

移行前は NUC (Intel N95/8GB) の systemd user service で OpenClaw を常駐させていました。モデルは[OpenRouter](https://openrouter.ai/)の deepseek-v3.2、定期タスクは heartbeat で 4 本(週末のブログネタ出し・技術トレンド収集・メモリ蒸留・GitHub 活動ログ)です。ワークスペースの Markdown はリポジトリで config-as-code 管理して、[Claude Code](https://claude.com/claude-code)で編集後に NUC へ rsync する運用です。[ESP-Claw を触ってみている](/esp-claw/)の記事で比較対象にしていたのが、この構成でした。

## hermes claw migrate で引っ越す

Hermes Agent には OpenClaw からの移行コマンドが公式に用意されています。移行スクリプト本体は skill として配布されているので、先にそれを入れてから実行します。

```bash
hermes skills install official/migration/openclaw-migration --yes
hermes claw migrate
```

これで人格 (SOUL.md)・ユーザープロフィール (USER.md)・長期記憶 (MEMORY.md)・日次メモリ・モデル設定・MCP サーバー定義が一括で移ります。嬉しい誤算だったのは自動要約で、220 行あった USER.md を Hermes 側の文字数上限(約 1,375 字)に合わせて自動で圧縮してくれました。チャネルも Telegram bot と Slack app のトークンをそのまま流用できます。

罠は 2 つ踏みました。1 つは secret の扱いで、migrate は OpenClaw の SecretRef を展開して Home Assistant の JWT を config.yaml に生値で焼き込みます。`~/.hermes/.env`に移して`Authorization: Bearer ${MCP_HOME_ASSISTANT_API_KEY}`の環境変数参照に書き換えました。もう 1 つはモデル指定の形式です。OpenClaw の`openrouter/deepseek/deepseek-v3.2`という 1 本の文字列がそのまま`model.default`に入り、"not a valid model ID" で 400 になります。Hermes は provider と model を分離する設計なので、手で直しました。

## cron で自前実装がごっそり消えた

OpenClaw の定期タスクは heartbeat という仕組みでした。60 分ごとに HEARTBEAT.md をエージェントに読ませ、該当タスクがなければ`HEARTBEAT_OK`を返させるポーリング型です。この方式だと「いつ実行するか」の判定をタスク側のプロンプトに書く必要があります。実際の HEARTBEAT.md はこうなっていました。

```markdown
## 週末ドラフト(土曜に1回)

**実行条件:** 現地時刻(JST)が **土曜の 10:00〜10:59** で、かつ **今週まだ実行していない** ときだけ。
それ以外は何もせず `HEARTBEAT_OK`。

**重複防止:** `memory/heartbeat-state.json` の `weeklyDraftDate`(YYYY-MM-DD)を確認する。
今日の日付と一致していれば実行済み＝スキップ。実行したら今日の日付を書き込む。
```

時間窓の判定も重複防止の state ファイルも、LLM に読ませるプロンプトとして自前実装するわけです。窓を 1 時間に設計しておかないと 60 分間隔の tick から漏れる、といった暗黙の結合もあります。タスクがない時間も LLM が空回りするので空振りに課金され続けるのも地味に嫌で、運用中に間隔を 30 分から 60 分に伸ばしたり、朝のダイジェスト配信を廃止したりとチューニングしていました。

Hermes は普通の cron でした。

```bash
hermes cron create "0 10 * * 6" "<タスクのプロンプト>" --name weekend-draft --deliver slack:<チャネル ID>
```

cron 式はシステムのタイムゾーン (JST) で解釈されるので、そのまま土曜 10:00 と書けます。時間窓判定と heartbeat-state.json は丸ごと消え、空回りもなくなりました。4 本のタスクは定義スクリプトごとリポジトリへ置き、冪等に再インストールできる形で管理しています。

cron 側にもハマりどころはありました。cron エージェントの terminal ツールは POSIX シェル経由でコマンドを実行するので、URL 中の`&`をクォートせずに書くとバックグラウンド実行として解釈され、本体のリクエストが捨てられて出力が空になります。GitHub 活動ログのタスクがこれを踏んで、実際にはコミットがあるのに「過去 7 日の活動なし」と誤報しました。いまはプロンプト側で`gh api -f KEY=VALUE`の`&`を含まない形式を強制しています。それでも、実行タイミングの制御をプロンプトに書いていた頃より確実に安定しています。

## メモリ上限で初日にハングした

OpenClaw のメモリはワークスペースの Markdown をエージェントが自由に読み書きする方式で、肥大化の管理は週次の蒸留タスクという運用でカバーしていました。Hermes は`memory`ツールが組み込みで、MEMORY.md にデフォルト約 2,200 字(USER.md は約 1,375 字)の上限があります。毎ターン context に注入される前提だから上限でトークンを抑える、という設計です。

初日からこの上限に引っかかりました。Slack で URL を覚えておいてと頼んだところ、ターンが`⏳ Working — iteration 8/90`のまま 27 分固まったのです。NUC 側で見ると gateway プロセスはネットワーク待ちのまま止まっていて、SIGTERM にも応答せず SIGKILL で強制終了しました。原因は MEMORY.md が 2,169/2,200 字でほぼ満杯だったこと。`memory add`が上限で弾かれ続け、整理(consolidation)の失敗を重ねた末にターンごと止まっていました。

回避は設定 1 つです。

```bash
hermes config set memory.memory_char_limit 4400
```

上げた分だけ毎ターンのトークンは増えるのでトレードオフですが、満杯が「静かなハング」として現れる障害モードは知らないと診断できません。上限そのものを外したければ、外部メモリプロバイダ([honcho](https://github.com/plastic-labs/honcho)や[mem0](https://github.com/mem0ai/mem0))に差し替える口も用意されています。

書き味なら、個人的には OpenClaw の自由記述に分があると思います。ただ、あちらは際限なく太る問題を運用で抑えていたのに対し、Hermes は上限という形で設計に織り込んでいる。不便さの種類が違うだけで、真面目に向き合っているのは Hermes の方だと感じます。

## スキル自動生成は勝手に育っていた

Hermes のレビュー記事は、ほぼ例外なくスキル自動生成を目玉として褒めています。使うほどエージェントが自分でスキルを書いて賢くなる、というあれです。移行の決め手の半分は skill まわりだったので、この機能があることは知っていました。ただ、意図して使ってはいませんでした。

ところがこの記事を直すにあたって実機を見たら、勝手に動いていました。`hermes skills list`に、インストールした覚えのない local skill が 6 個並んでいます。はっきり出自が分かったのは、自分が Claude Code 用に書いたブログ執筆 skill の写し(タイムスタンプは移行日)。残りは cron の最適化手順や[Tailscale](https://tailscale.com/)越しのサービス構成など、移行後の運用から書き起こされたように見えます。学習タイムライン(`hermes journey`)にはメモリも 30 個積み上がっていました。

写しには勝手な追記も入っていました。「骨子の確認がないまま本文を書き始めてはいけない」という禁止文が、同じ文面のまま 2 回重ねて足されています。スキルの棚卸し役(curator)は 7 日間隔の設定でまだ 0 回、生成・改変されたスキルのレビューは人間側もこれからです。中身を読んでから、この記事に追記するか別の記事にします。

## 出戻りはたぶん無い

OpenClaw は停止したまま`~/.openclaw`ごと残してありますが、戻す理由が見当たりません。定期タスクの安定だけで移行した甲斐がありました。

宿題も残っています。ローカル LLM の primary 化です。Windows のゲーミング PC で動かしている[Ollama](https://ollama.com/)を繋いでみたものの、hermes3:8b (Q4) に人格と記憶を注入して日本語で自己紹介させると「お三品かもしれませんが」のような非文が返ってきます。Hermes はモデルに 64K コンテキストを要求するため、16GB VRAM で載る 14B 級も選択肢から落ちました。primary は OpenRouter のまま(現在 deepseek-v4-flash)で、ローカルを fallback に回しています。16GB VRAM で日本語が実用になる 64k コンテキストのモデルが出てきたら、また構成を見直すつもりです。それまでの楽しみは、勝手に増えていく local skill の観察です。
