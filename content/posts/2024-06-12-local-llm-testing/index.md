---
title: ローカルLLMを試す
created_at: '2024-06-12T15:21:37.000Z'
updated_at: '2024-06-12T15:52:56.000Z'
path: /local-llm-testing
category: Scrapbox
tags:
  - imported
  - scrapbox
---
環境
- Windows
- RTX3070
手始めに
- https://zenn.dev/fp16/articles/e8c61e2f62e6b6
インストール、モデル追加
- wsl から linux 版で試すもファイルシステムが read only になってしまった
- 一旦 windows 版で試すことに
どんな感じ
- ollama run （モデル名）でコンソール上から入力できる
- <https://gyazo.com/918f6a9fed9418d3d4d6d7b331b54c7e>
- curl でも入力できる
- <https://gyazo.com/1ace1dad41f8b2626b3444072271ba94>
モデルをいろいろと試す	
- https://ollama.com/library/llama3
- Facebook製 
- https://ollama.com/library/qwen2
- Alibaba製
- たしかに賢い
- 中国なのでNGワードっぽいこと聞いたが正しく返してくれた
- https://ollama.com/library/dolphin-mixtral
- GimmieやOpenAIや他モデルと違い	検閲のされていないモデル
- これぞローカルLLMっぽい。使用者の倫理観が問われる
- でも遅い
ファインチューニング
- ゼロからつくると大変なので既存モデルをチューニングする手法
- TODO
WebUIを作るかチャットボット化
- TODO
