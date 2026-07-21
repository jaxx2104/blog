---
title: "Hermes を定額プランに移して、節約のための設計をやめた"
created_at: '2026-07-21T00:00:00.000Z'
updated_at: '2026-07-21T00:00:00.000Z'
path: /hermes-opencode-go
description: "NUC 常駐の Hermes Agent の primary を OpenRouter 従量課金から OpenCode Go の $10 定額に移した。単価でモデルを選ぶ、cron は週次に束ねる、空振りを嫌う。従量課金が要求していた節約の設計を、1 つずつ外していった話。"
category: 開発環境
tags:
  - hermes-agent
  - opencode
  - llm
  - agent
---

[前回移行した](/openclaw-to-hermes-agent)NUC 常駐の[Hermes Agent](https://hermes-agent.nousresearch.com/)の primary モデルを、[OpenRouter](https://openrouter.ai/)の従量課金から[OpenCode](https://opencode.ai/) Go という月 $10 の定額プランに切り替えました。きっかけはコストが痛かったからではありません。先にやりたい使い方がありました。cron の日次化や、「リンクを DM に投げておくと後で要約が返ってくる」ような、エージェントを呼ぶ回数を増やす使い方です。従量課金のままでは、呼ぶたびに財布の減る心理が邪魔でした。

TL;DR:

- primary を OpenRouter 従量課金から OpenCode Go 定額(月 $10)に切替。最初はモデルを変えず transport だけ替えた
- その後、同じ定額枠内で glm-5.2 に昇格。モデル選定の基準が単価から速度とレート枠に入れ替わった
- 週次バッチに束ねていた cron を日次に揃え、wiki-gardener と DM inbox を足した。空振りを許す方向に設計をやり直した
- Go プランのキーは`/zen/go/v1`専用。従量の`/zen/v1`に投げると CreditsError で弾かれる罠
- 移行から数日、$10 で従量時代より明らかに多く回せている

## 従量時代は節約の工夫だらけだった

移行前の構成を振り返ると、こんな具合です。

- モデルは単価で選ぶ。primary を deepseek-v3.2 にしたときの理由は per-token 単価の安さで、その後の deepseek-v4-flash への切替も同じ発想でした
- 定期タスクは週次に束ねる。技術トレンド収集は金曜 20:00、GitHub 活動ログは金曜 22:00。毎日回す発想はなく、まとめて週 1 回です
- 空振りを嫌う。[OpenClaw](https://github.com/openclaw/openclaw)時代は heartbeat の空振り課金が嫌で間隔を 30 分から 60 分に伸ばしていました。Hermes に移ってからも、複数モデルへ並行で答えさせて集約する MoA は出荷時デフォルト(gpt-5.5 と opus を参照モデルに使う)だと高いので封印しました。auxiliary(組み込みの補助タスク)が Nous のエンドポイントを無駄にプローブするのも止めています

どれも単体では合理的です。ただ全体としては「エージェントを呼ぶこと自体を節約する」方向に設計が寄っていく。冒頭に書いた、呼ぶ回数を増やしたい構想とは真逆です。

## transport だけ替える

OpenCode Go は、コーディングエージェント OpenCode の定額プランです。OpenAI 互換のエンドポイントが生えているので、Hermes からは custom provider として繋がります。現在の設定はこうなっています。

```yaml
model:
  default: glm-5.2
  provider: custom
  base_url: https://opencode.ai/zen/go/v1
  api_key: ${OPENCODE_API_KEY}
fallback_providers:
  - provider: openrouter
    model: deepseek/deepseek-v4-flash
  - provider: custom
    model: gemma4-64k:8b
    base_url: http://iwawin:11434/v1
```

切替の初日は`default`を deepseek-v4-flash のままにしました。従量時代と同じモデルなので、変わるのは transport だけ。挙動がおかしくなったとき、疑う場所を 1 つに絞れます。

罠はキーの向き先でした。Go プランのキーは`/zen/go/v1`でだけ有効で、従量課金(Zen クレジット)用の`/zen/v1`に投げると CreditsError になります。エラー名だけ見ると残高の問題に見えますが、実際はパスが違うだけです。

従量をやめても OpenRouter は解約していません。fallback の 1 段目に残して、OpenCode 側の障害時はそちらへ、それも駄目なら Windows マシンの[Ollama](https://ollama.com/)へ、と逃げる構成です。

## 同じ $10 の中で glm-5.2 へ

定額に移って、モデルの選び方が変わりました。従量では単価表とにらめっこでしたが、枠内ならどのモデルを選んでも請求は $10 のまま。基準が単価から速度とレート枠に入れ替わりました。

比較したのは glm-5.2 と kimi-k3 です。glm-5.2 を選んだ理由は 3 つあります。

- 生成が 3 倍ほど速い。DM の応答性に効く
- レート枠が広い。夜の cron 窓のようなツールを何十回も呼ぶ agentic なループだと、5 時間あたり約 950 vs 約 280 リクエストの差になる
- kimi-k3 の強み(ハードなコーディングと vision)は、日本語のパーソナルアシスタント用途には効かない

従量なら、ここで 2 モデルの単価差の計算が始まるところです。その計算が丸ごと消えました。気に入らなければ config 1 行で戻せます。

## 節約のための設計を 1 つずつ外す

定額化で従来の節約設計は意味を失ったので、外していきました。

まず cron を週次から日次へ。定額では週次バッチは何も節約しません。技術トレンドは毎朝 08:00、GitHub 活動ログは平日 08:30 に変えました。新着がない日は、前回どこまで見たかを覚えて差分だけ報告する仕組み(watermark)のおかげで 1 行の報告になるだけなので、毎日回して困ることがない。空振りを許せるようになったわけです。あわせて wiki-gardener(月〜土 22:00)という、エージェントが自分用に書き溜めている wiki を毎晩 2 ページだけ手入れする軽いタスクも足しました。従量時代なら「そのために毎晩 LLM を回すのか」と思って作らなかった類のタスクです。

日次化して、朝 Slack に報告が並ぶのを見る習慣ができました。週 1 でまとめて読むより、毎日 1 行ずつの方が生活のリズムに合います。

次に DM inbox。SOUL.md に「裸のリンクだけが DM で来たら、あとで読む inbox として扱う」というルールを書きました。要約を返して、wiki の基準を満たすものだけページ化するところまでがエージェントの仕事です。ブラウザのタブへ積む代わりの置き場として使い始めています。

最後に MoA。`/moa`と明示したときだけ発火する構成はそのままに、参照モデルを OpenRouter 従量から Go 枠内(glm-5.2 と kimi-k2.7-code、集約は deepseek-v4-pro)に差し替えました。高いから封印していた機能が、呼んでも請求の動かない機能に変わりました。

## 実感と留保

コスト系記事の定番の結論は「毎日使うなら定額が得、たまにしか使わないなら従量」です。一方で、常駐エージェントは通常ユーザーの[6〜8 倍トークンを消費する](https://blog.kilo.ai/p/i-was-running-openclaw-with-my-claude)ので定額の前提を壊す、とも言われます。Anthropic が 2026 年 4 月に[Claude サブスクでの OpenClaw 利用を締め出した](https://techcrunch.com/2026/04/04/anthropic-says-claude-code-subscribers-will-need-to-pay-extra-for-openclaw-support/)のは、その帰結でした。

自分の場合はどうか。$10 で従量時代より明らかに多く回せている実感があります。日次 cron と DM 対話を全部載せても、glm-5.2 の枠にはまだ遠い。DM 専業の個人エージェントは、常駐といっても消費は大したことがないのだと思います。6〜8 倍論が想定しているのは、コードを書き続ける自律エージェントの方でしょう。

とはいえ移行から数日です。この生活を 1 か月続けて請求とレート枠がどうなるかは、また追記します。ローカル LLM の primary 化という[前回からの宿題](/openclaw-to-hermes-agent)も残っていますが、単価表を開かない生活は思ったより快適で、腰が重くなりつつあります。
