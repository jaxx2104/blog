---
title: "テキストを生成しないモデル Jev を、スクリプトの部品として使ってみる"
created_at: '2026-09-19T00:00:00.000Z'
updated_at: '2026-09-19T00:00:00.000Z'
path: /typesafe-jev
description: "TypeSafe AI の Jev は文章を返さず、型の決まった答えと確率だけを返すモデル。日本から 1 リクエスト 3 問で約 500ms。呼び出す側から見て何が保証され何が保証されないかを整理し、購入メールの仕分けと changelog の順位付けに入れた結果を書く。"
category: 開発環境
tags:
  - typesafe
  - jev
  - llm
  - agent
---

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)は[TypeSafe AI](https://typesafe.ai/)が 2026-09-15 に早期アクセスで公開したモデルです。[Hacker News](https://news.ycombinator.com/item?id=49717558)と Reddit で話題になっていたので waitlist に登録し、招待が届いた日に触りました。

自分はスクリプトから呼ぶ関数として使いたいので、そこを中心に見ます。

TL;DR:

- 文章は返ってこない。返るのは yes/no の確率、選択肢、段階評価の 3 種類だけで、型は必ず守られる
- 日本から 1 リクエスト 3 問で 481〜520ms。入力 392 トークンで、料金は $0.000016 ほど
- 保証されるのは型まで。判断の正しさ、実行ごとの値、質問どうしの整合は保証されない
- 購入メールの仕分けでは、エージェントの読む本数が 30 通中 14 通に減った。誤 skip は 0
- changelog は Score の閾値で切ると 80 行中 57 行が残ったので、上位 15 件を取る方式に変えた
- Jev の戻り値は、信頼できない外部入力として扱っている

## 何を渡して、何が返るか

渡すものは 2 つです。判断の対象になる`state`(テキストか JSON)と、型の付いた質問の集まりです。質問の型は 3 つあります。

| 型 | 聞けること | 返るもの |
|---|---|---|
| Noul | この記述は正しいか | `noul`(0〜1) |
| Choice | 選択肢のどれか(最大 255 択) | `choice`、`probabilities`、`confidence` |
| Score | 段階のどこに位置するか | `score`、`probabilities`、`confidence` |

動作確認に使ったスクリプトがこれです。二重請求の苦情文に 3 種類の質問をまとめて投げています。

```python
import time

from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

client = TypeSafeClient()
state = "I was charged twice this month. Please fix it ASAP, this is unacceptable."
questions = {
    "billing": Noul(instructions="Is this message about billing?"),
    "team": Choice(
        instructions="Which team should handle this?",
        criteria={"billing": "payments, invoices, refunds", "technical": "bugs, outages", "sales": "pricing, upgrades"},
    ),
    "urgency": Score(instructions="How urgent is this?", criteria=["low", "medium", "high"]),
}
t0 = time.perf_counter()
r = client.system_one(state, questions)
dt = (time.perf_counter() - t0) * 1000
print(f"model={r.model} request_id={r.request_id} latency={dt:.0f}ms")
n = r.nouls["billing"]; c = r.choices["team"]; s = r.scores["urgency"]
print(f"billing  noul={n.noul:.3f} confidence={getattr(n,'confidence',None)}")
print(f"team     choice={c.choice} confidence={getattr(c,'confidence',None)} probs={getattr(c,'probabilities',None)}")
print(f"urgency  score={s.score} confidence={getattr(s,'confidence',None)} probs={getattr(s,'probabilities',None)}")
print(f"usage={r.usage}")
```

`smoke.py`として保存して動かします。API キーは、招待が届いたあとに console の Settings > Keys で発行できます。

```bash
export TYPESAFE_API_KEY=...  # console で発行したキー
uv run --with typesafe-sdk==0.5.7 smoke.py
```

実行には[uv](https://docs.astral.sh/uv/)を使っています。[typesafe-sdk](https://pypi.org/project/typesafe-sdk/)は Python 3.10 以上が必要です。PyPI の最新は 2026-09-18 に出た 0.7.0 ですが、自分の uv は`exclude-newer = "7 days"`で公開から 7 日以内のパッケージを入れない設定にしているので、0.5.7 が入りました。上のコードを確かめたのもこの版です。出力はこうなります。

```text
model=jev-1.13.0 request_id=req_01a0b9103269771bb97a505ecbd25a88 latency=490ms
billing  noul=0.990 confidence=None
team     choice=billing confidence=1.0 probs={'billing': 1.0, 'technical': 0.0, 'sales': 0.0}
urgency  score=1.95 confidence=0.92 probs={0: 0.0, 1: 0.05, 2: 0.95}
usage=Usage(input_tokens=392, output_tokens=69)
```

SDK を使わなくても、エンドポイントは`POST https://api.typesafe.ai/v1/systemone`の 1 本だけです。後半で出てくる自分のスクリプトは、標準ライブラリだけで書いたこの関数で呼んでいます。

```python
import json
import time
import urllib.error
import urllib.request

API_URL = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"


def ask(key: str, state, questions: dict) -> dict:
    """One request; returns the `answers` map. RuntimeError("HTTP <code>") on
    failure — never the urllib error itself, which can carry request headers."""
    payload = {"state": state, "model": MODEL, "questions": questions}
    req = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "hermes-typesafe-jev/1"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)["answers"]
        except urllib.error.HTTPError as e:
            # 429 / 529 are the two the API docs say to back off and retry.
            if e.code in (429, 529) and attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"HTTP {e.code}") from None
        except (urllib.error.URLError, TimeoutError) as e:
            raise RuntimeError(f"network: {type(e).__name__}") from None
    raise RuntimeError("unreachable")
```

認証は Bearer トークンで、429 と 529 は待って再試行するよう API の docs にあります。質問は SDK のクラスの代わりに、`type`を持つ dict で書きます。

```python
questions = {
 "billing": {"type": "noul", "instructions": "Is this message about billing?"},
 "team": {"type": "choice", "instructions": "Which team should handle this?",
          "criteria": {"billing": "payments, invoices, refunds", "technical": "bugs, outages", "sales": "pricing, upgrades"}},
 "urgency": {"type": "score", "instructions": "How urgent is this?", "criteria": ["low", "medium", "high"]},
}
```

`ask(os.environ["TYPESAFE_API_KEY"], state, questions)`で呼べます。同じ苦情文を投げたときのレスポンス全体を、そのまま載せます。`ask()`が返すのはこのうちの`answers`です。生の JSON では`probabilities`のキーが文字列になります。

```json
{
 "model": "jev-1.13.0",
 "answers": {
  "billing": {
   "type": "noul",
   "noul": 0.99
  },
  "team": {
   "type": "choice",
   "choice": "billing",
   "confidence": 1.0,
   "probabilities": {
    "billing": 1.0,
    "sales": 0.0,
    "technical": 0.0
   }
  },
  "urgency": {
   "type": "score",
   "score": 1.94,
   "confidence": 0.92,
   "legend": {
    "0": "low",
    "1": "medium",
    "2": "high"
   },
   "probabilities": {
    "0": 0.0,
    "1": 0.05,
    "2": 0.95
   }
  }
 },
 "usage": {
  "input_tokens": 392,
  "output_tokens": 69
 }
}
```

見て気付いた点をいくつか。

- 文章がどこにもない。`choice`は自分が渡した選択肢のキーで、`score`は渡した段階の添字の上の値。パースも、JSON が壊れていたときのリトライも要らない
- `confidence`が付くのは Choice と Score だけ。Noul は 0〜1 の値そのものが答えで、[docs](https://docs.typesafe.ai/confidence)にも "Noul answers don't carry one" とある
- `score`は、段階ごとの確率で重みを付けた平均。medium に 0.05、high に 0.95 なので 2 の少し手前になる。SDK で投げたときは 1.95、こちらは 1.94 で、実行ごとに少し動く
- 3 問は並列に、互いを見ずに評価される。質問を足しても応答時間はほとんど変わらないと docs は書いている

レイテンシは WSL から、日本の自宅回線で測りました。初回が 520ms、そのあと 4 回投げて 481〜507ms です。公式の 70〜500ms はサービス基盤のある米国西海岸が基準なので、日本からは上限あたりになりそうです。東京から[Vercel AI Gateway](https://vercel.com/ai-gateway)経由で測った[AI Native の記事](https://www.ai-native.jp/blog/typesafe-jev-system-one-model-guide)では往復 1.1 秒前後だったので、経路でかなり変わります。

料金は入力が $0.042/MTok、出力は無料です。上の 392 トークンなら 1 リクエスト $0.000016 ほどになります。

## 保証されること、されないこと

既存の記事をいくつか読んだ限り、安い、速い、型が壊れないという点はどこも評価していました。疑われていたのは、hallucination ゼロが型の話でしかないことと、[公式ブログ](https://typesafe.ai/blog/introducing-system-one-models-and-jev)の 193.6 倍速い・444.6 倍安いという数字が条件の良い側の値であることの 2 点です。[The Register](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711)は、自然言語を出さないモデルと LLM の hallucination 率を並べるのはフェアではないと書いていますし、日本語では[この記事](https://zenn.dev/amu_lab/articles/jev-system-one-guarantee-scope)が型保証と判断の正しさを分けて論じています。

使ってみて、どれにも同意です。

呼び出す側から見ると、保証されるのは、答えが質問で定義した型に必ず収まることだけです。選択肢に無い値や、段階の外の値は返りません。

保証されないものは、公式の[limitations のページ](https://docs.typesafe.ai/model-jaggedness/jev-1.13)に列挙されています。スクリプトを書く立場で並べ直すと、こうなります。

| 保証されないこと | docs が挙げている内容 | コード側でやること |
|---|---|---|
| 行間を読むこと | 文字どおりに読む。含意や遠回しな言い方は拾わない | 条件を instructions に明示し、境界例を criteria に書く |
| 計算 | 数えられない。日付や数値の比較、算術もできない | 候補をコードで列挙して 1 件ずつ聞き、合計や比較はコードで取る |
| Score の精密さ | 段階の間の値を、精密な量として扱えない | 段階の判定や大小の比較にだけ使う |
| 雑音への強さ | 無関係な情報の多い state では精度が落ちる | 渡す前に絞る |
| 敵対的な入力への耐性 | state を敵対的とみなさない。埋め込まれた指示で答えが動く | 信頼できない入力への答えを最終判断にしない |
| 質問どうしの整合 | 同じことを Noul と Choice で聞いても数字は揃わない | 1 つの判断は 1 つの聞き方に決め、恒等式はコードで守る |

最後の行は、docs に実例が載っています。二重請求の問い合わせに「返金を求めているか」と「返金以外を求めているか」を Noul で聞くと、0.72 と 0.47 が返り、足すと 1.19 になります。Noul で決めた閾値を Choice に持ち込むな、とも書かれています。

表に無いものが 3 つあります。

1 つは言語です。[models のページ](https://docs.typesafe.ai/models)には、学習の中心は英語で、CJK を含む他の言語は「扱えるが同等ではない。自分のコンテンツで試すこと」とあります。

もう 1 つは、実行ごとの値です。上の 2 つの出力を見比べると、同じ苦情文なのに urgency の`score`が 1.95 と 1.94 で違っています。`ask()`で続けて 8 回投げた結果は 1.94、1.95、1.95、1.94、1.95、1.94、1.93、1.95 でした。この差なら何も困りませんが、閾値の近くでは結果が変わります。[jev-lab](https://github.com/danielhirt/jev-lab)は同じ入力を 20 回繰り返し、境界例の値が 0.38〜0.52 の間で動いて、0.5 の閾値を 6 回またいだと報告しています。

3 つ目はモデルの版です。`jev-latest`と`jev-preview`はエイリアスで、今はどちらも`jev-1.13.0`を指しています。新しい版が出れば、こちらが何も変えなくても答えが変わります。docs は、閾値を調整したなら版を固定するよう勧めています。と言いつつ、自分の`ask()`の`MODEL`は今も`jev-latest`のままで、版を固定していません。固定するなら、ここを`jev-1.13.0`にします。

閾値については、[docs](https://docs.typesafe.ai/confidence)にコード例があります。confidence が 0.5 未満なら人へ回し、それ以上でも、送金の承認のようにやり直せない操作は 0.9 を超えたときだけ進める、という形です。自分の閾値もこの考え方で決めました。

## 2 か所に入れた

[自宅の NUC で動かしているエージェント](/openclaw-to-hermes-agent)の定期ジョブのうち、2 つの前段で Jev を呼ぶようにしました。どちらも Python の標準ライブラリだけで書いた小さなスクリプトです。

### 購入メールの仕分け

[購入履歴を wiki に取り込んでいる](/hermes-lifelog)週次のジョブは、検索に掛かったメールを最大 50 通、エージェントが全部開いて読んでいました。注文確認かどうかを知るためだけに LLM が 1 通ずつ本文を読み、ほとんどを捨てます。

この手前で、1 通につき 1 リクエスト、2 つの質問を投げます。メールの種類を聞く Choice と、「届く物理的な商品の注文確認か」を聞く Noul です。

```python
KIND_INSTRUCTIONS = (
    "What kind of mail is this? Judge from `subject` and `body`. "
    "The mail is usually written in Japanese."
)
KIND_CRITERIA = {
    "order_confirmation": "Confirms that a new order or purchase was just placed; "
                          "typically lists the items, prices and an order number.",
    "shipping_notice": "Says that an already placed order has shipped, is out for "
                       "delivery, was delivered, or is ready for pickup.",
    "review_request": "Asks the customer to review or rate a product, a shop or a delivery.",
    "marketing": "Promotion, newsletter, coupon, sale, point campaign or product recommendation.",
    "receipt_only": "A receipt, invoice or payment-completed notice with no order details, "
                    "such as a card charge or a billing statement.",
    "service_or_subscription": "About a service, subscription, booking, ticket, digital content, "
                               "mobile plan or membership rather than goods.",
    "other": "None of the above.",
}
```

Noul のほうはこうです。Noul にも criteria を付けられて、キーは`true`と`false`です。state は`from`、`subject`、`date`、`body`をキーに持つ dict で、2 問をまとめて`ask()`に渡します。

```python
PHYSICAL_INSTRUCTIONS = (
    "Does this mail confirm an order for a physical item that will be delivered?"
)
PHYSICAL_CRITERIA = {
    "true": "A newly placed order for tangible goods that will be shipped or handed over.",
    "false": "Not a new order, or the order is for a service, subscription, "
             "digital content or anything else that is not a tangible item.",
}
NON_ORDER_KINDS = set(KIND_CRITERIA) - {"order_confirmation"}


def ask_jev(key: str, state: dict) -> dict:
    return ask(key, state, {
        "kind": {"type": "choice", "instructions": KIND_INSTRUCTIONS,
                 "criteria": KIND_CRITERIA},
        "physical_goods": {"type": "noul", "instructions": PHYSICAL_INSTRUCTIONS,
                           "criteria": PHYSICAL_CRITERIA},
    })
```

メール本文は日本語ですが、docs に精度が最も良いのは英語だとあるので、instructions と criteria は英語で書いています。文字どおりに読むモデルなので、各選択肢の criteria には何が含まれるかを具体的に書きました。state にはメールの差出人、件名、日付と、HTML タグを除いて先頭 1,500 字に切った本文を渡します。

返ってきた答えは、コードで 3 つの行き先に振り分けます。`confidence`は kind の confidence、`physical`は`physical_goods`の noul の値です。

```python
def decide(kind: str, confidence: float, physical: float, args) -> str:
    if kind == "order_confirmation":
        if confidence >= args.read_confidence and physical >= args.physical:
            return "read"
        return "unsure"
    if kind in NON_ORDER_KINDS and confidence >= args.skip_confidence:
        return "skip"
    return "unsure"
```

既定値は read が confidence 0.8 以上かつ physical 0.7 以上、skip が confidence 0.9 以上です。スクリプトは 1 通ごとの`kind`、`kind_confidence`、`physical_goods`、`action`を JSON の配列で標準出力に出し、エージェントはそれを見て read と unsure だけを開きます。

skip のほうを厳しくしているのは、間違えたときの損が違うからです。誤って read にしてもメールを 1 通余分に開くだけで、エージェントが本文を確かめてから記録するので実害はありません。誤って skip にすると、注文が 1 件 wiki に記録されず、それに気付く手段もありません。

実際のメール 30 通(直近 45 日分)に掛けた結果は、read 3、skip 16、unsure 11 でした。誤って skip されたものはありません。エージェントが読むのは 30 通中 14 通になります。

unsure に残ったのは、povo、Steam、Google Play、Apple の領収書や、マクドナルドのモバイルオーダーでした。人が見ても「モノの注文か」で迷うものばかりなので、この結果には納得しました。unsure は従来どおりエージェントが読みます。

ハマりどころ: 発送通知は`physical_goods`が 0.9 前後と高く出ます。モノが届く話ではあるので、文字どおりに読めばそうなります。これを skip の条件に混ぜると注文確認まで skip してしまうので、skip は kind の confidence だけで決めています。

### changelog の順位付け

もう 1 つは、Claude Code の[CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)を毎朝要約するジョブです。1 リリースに 40〜80 行ある英語の箇条書きをエージェントが全部読み、自分の環境に関係する数行を選んでいました。

こちらは 1 行につき 1 リクエストで、3 問を投げます。話題を 10 択で聞く Choice、破壊的変更かを聞く Noul、そして自分の環境を英語で説明した段落に照らした関連度を 4 段階で聞く Score です。

環境の説明は instructions ではなく state に入れています。state は`{"reader": READER, "entry": <changelog の 1 行>}`の形です。

```python
READER = (
    "The reader runs the Claude Code CLI in a terminal on WSL (Linux on Windows) and on a "
    "headless Linux server. They rely heavily on hooks, skills, plugins, MCP servers, "
    "subagents and agent teams, permission modes and sandbox settings, settings files "
    "managed as dotfiles, and an LLM gateway configured through ANTHROPIC_BASE_URL. "
    "They do not use Amazon Bedrock, Google Vertex AI or Microsoft Foundry, do not run "
    "Claude Code natively on Windows or on macOS, and do not use the VS Code or JetBrains "
    "IDE extensions or the desktop app."
)
```

Score と Noul の instructions、関連度の段階はこう定義しました。話題の Choice は`hooks`、`mcp`、`breaking_change`、`platform_specific`など 10 択です。`breaking_change`が選ばれた行は、順位と関係なく残します。

```python
RELEVANCE_INSTRUCTIONS = (
    "`entry` is one line from the Claude Code changelog and `reader` describes one user's setup. "
    "How much does this reader need to know about this entry?"
)
BREAKING_INSTRUCTIONS = (
    "`entry` is one line from the Claude Code changelog. Does it remove, rename or deprecate "
    "something, or change existing behaviour, so that a configuration, script or workflow that "
    "worked before may stop working or behave differently?"
)
RELEVANCE_LEVELS = [
    "Irrelevant: about a platform, provider, IDE or feature the reader does not use.",
    "Minor: a cosmetic change, a small fix or a rare edge case the reader is unlikely to notice.",
    "Relevant: changes or fixes a feature the reader uses regularly.",
    "Must know: can break or silently change the reader's existing configuration, automation or "
    "daily workflow, or fixes a failure that would block their work.",
]
```

`ThreadPoolExecutor`の 6 並列で 80 行を処理して、約 9 秒です。

Score の閾値で切ると、うまくいきませんでした。1.5 以上、つまり minor より relevant に近いものだけを残す条件で、80 行中 57 行が残ります。

分布を見ると、使っていないものははっきり分かれていて、VS Code、Windows、Bedrock の行はすべて 0.1 未満でした。一方、使っている機能の行は 1.7〜2.6 に固まっていました。hooks も MCP も権限設定も日常的に使っているので、どの行も relevant ではあります。モデルは聞かれたとおりに答えています。これも納得でした。

1.7〜2.6 の範囲の中でも、並び順には意味がありました。そこで閾値をやめ、バージョンごとに上位 15 件を取る形に変えています。並べ替えと件数のカウントはコードでやります。破壊的変更の Noul が 0.9 以上の行は、順位に関係なく残します。

エージェントが全文を読んで選んだ 12 項目と突き合わせると、Jev の順位で上位 15 に 7 件が入っていて、先頭の 2 件は一致、11 件目が入るのは 28 位でした。大きく外したのは AGENTS.md 対応の行で、43 位です。壊れた、直ったと書かれた行は score が高く、新機能の追加の行は低く出る傾向がありそうです。Must know の段階を「壊す、または黙って変える」と定義したのは自分です。

出力は、選んだ行の全文と判定値、選ばなかった行のうち上位 12 件の 1 行要約、残りの件数です。サイズは生ログ 12KB に対して約 8KB。トークンの節約は小さく、役に立っているのは順位のほうです。

## 決定論のスクリプトに混ぜてみて

Claude Code の skill はスクリプトを呼べます。自分はこれまで、決定論で済む処理をスクリプトに出すことで、速さと再現性を取ってきました。検索、集計、並べ替え、ファイルの書き込みはスクリプトで、エージェントには判断だけをさせていました。

Jev を入れると、スクリプトの中に非決定な処理が入ります。自分のスクリプトでは、Jev は最初のほうに載せた`ask()`という関数 1 つです。

見た目は dict を返す普通の関数で、型も決まっています。ただ中身は確率なので、同じ入力に同じ出力が返る前提のテストは書けません。これが良いことなのか悪いことなのか、書きながら考えていました。

良いと思ったのは、非決定な部分にコード上で名前と型を付けられることです。`kind_confidence >= 0.9`という条件も、`unsure`という行き先も、コードとしてレビューできます。プロンプトに「迷ったら本文を読んで」と書くより、検査しやすいと思います。

微妙なのは、意味の判断の仕様が instructions と criteria という英語の文字列に入ることです。コードともエージェント向けのプロンプトとも別に、管理するものが 1 つ増えました。挙動はこの文字列で決まりますが、型チェックや単体テストでは検証できず、ラベルを付けた実データで確かめるしかありません。発送通知の`physical_goods`が高く出ることも、Score の上側が固まることも、実データを流すまで分かりませんでした。

今のところ、Jev の戻り値は信頼できない外部入力として扱うことにしています。unsure を置いて従来どおりエージェントに読ませているのも、Jev に聞けなかったら終了コード 3 を返して生ログを読ませているのも、そのためです。メール本文も changelog も第三者が書いたテキストなので、記録に残すかどうかの最終確認は、エージェントが本文を見て行います。
