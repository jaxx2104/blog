---
title: Claude に聞きながら chezmoi で開発環境を日々整備している
created_at: '2026-06-07T00:00:00.000Z'
updated_at: '2026-06-07T00:00:00.000Z'
path: /chezmoi-daily-dotfiles
description: dotfiles を chezmoi 管理にして約4ヶ月半。Claude Code に現構成を見せてモダン構成を聞く習慣と、複数マシン運用の組み合わせで、開発環境を日々整備するようになった話。
category: 開発環境
tags:
  - chezmoi
  - dotfiles
  - claudecode
---
dotfiles を [chezmoi](https://www.chezmoi.io/) で管理し始めて約 4 ヶ月半になります。リポジトリの commit 数は 156、直近 2 ヶ月は月 30〜65 commits のペースで、ほぼ毎日なにかしら手を入れています。

TL;DR:

- dotfiles が「たまに直すもの」から「毎日触るもの」に変わった
- 変わった理由は 2 つ。Claude Code に現構成を見せて「今ならどうする？」と聞く習慣と、複数マシン運用で push / pull が日常動作になったこと
- 副産物として、ツールやエコシステムのキャッチアップが進む

## 日々整備が続いている理由は 2 つ

1 つめはマシンの数です。WSL と Mac 2 台（私用・会社）の計 3 環境を同じ chezmoi ソースから apply しています。全マシンのセットアップを終えると、どこかで直した設定を別のマシンで pull する、という動作が毎日発生します。pull する流れで気になったところを直して push する。この往復が習慣の土台になった気がします。

2 つめは [Claude Code](https://claude.com/claude-code) です。設定ファイルを開いて「この構成、今ならどうするのがモダン？」と聞くと、改善ネタが尽きません。提案された変更をその場で適用して、`chezmoi diff` で確認して commit する。1 回の会話が 1〜数 commits になります。

この 2 つが揃った結果が、冒頭の commit ペースです。

## 整備ループの実例

「聞く → 直す → commit → 別マシンで pull」のループを、規模の違う 3 つの例で紹介します。

### 一気に入れる: modern unix CLI 一式

「ターミナル周りで今どきの定番ツールを揃えたい」と聞いて、いわゆる [modern unix](https://github.com/ibraheemdev/modern-unix) 系の CLI を一気に導入しました。[mise](https://mise.jdx.dev/) の config には今もこのときのセクションがそのまま残っています。

```toml
# modern unix
ripgrep = "latest"
fd = "latest"
bat = "latest"
eza = "latest"
fzf = "latest"
zoxide = "latest"
jq = "latest"
yq = "latest"
```

このとき良かったのは、ツールを入れるだけで終わらず alias や pager の設定まで会話で進んだことです。`ls` / `tree` を [eza](https://github.com/eza-community/eza) の alias に、`MANPAGER` を [bat](https://github.com/sharkdp/bat) に、[fzf](https://github.com/junegunn/fzf) の検索ソースを [fd](https://github.com/sharkdp/fd) に、git の pager を [delta](https://github.com/dandavison/delta) に。さらに `push.autoSetupRemote` や `rerere` といった modern git defaults まで、1 つの流れでまとめて入りました。

### 役割分担を聞く: brew か mise か

パッケージをどこで管理するかは何度か引っ越しました。最初は [Homebrew](https://brew.sh/) に寄せていました。その後 Claude に相談したら「単体バイナリで完結する CLI は mise の方が向いている」という整理を提案され、納得して brew → mise に移しました。chezmoi の external 機能で入れていたツールも mise に寄せました。

このとき出会った [tealdeer](https://github.com/tealdeer-rs/tealdeer) や [btop](https://github.com/aristocratos/btop) の罠は、config のコメントとして残しています。

```toml
# dbrgn/tealdeer ships only completions/licenses on GitHub releases, no binaries.
"cargo:tealdeer" = "latest"
```

```toml
{{- /* aqua's btop registry only ships linux/amd64 binaries; mac uses brew. */}}
{{- if eq .chezmoi.os "linux" }}
btop = "latest"
{{- end }}
```

次に同じところで悩んだとき、コメントを読めば（自分も Claude も）同じ失敗を繰り返さずに済むはずです。

### 細かく直す: 気になったその日に 1 commit

大きな導入だけでなく、日々の小さな引っかかりもその日のうちに直します。

- [atuin](https://atuin.sh/) の履歴検索で、選択した瞬間にコマンドまで実行されるのが怖かったので、プロンプトに戻すだけに変更（`enter_accept = false`）
- シェル起動のたびに 1Password の認証が走って煩わしかったので、secret の読み出しを [`op inject`](https://developer.1password.com/docs/cli/) でバッチ化し、結果をディスクにキャッシュして Touch ID を 8 時間に 1 回へ

どれも単体では数行の変更ですが、「気になる → 聞く → 直る」のサイクルが短いので、引っかかりを放置しなくなりました。

副産物として、キャッチアップが勝手に進む気がします。mise のバックエンドの仕組み、`op inject` という CLI の使い方、chezmoi の `run_onchange` スクリプト、modern git defaults。どれも自分から調べに行ったというより、整備の会話の中で「そういうのがあるのか」と知ったものです。

## 構成のポイント

chezmoi のテクニック自体は、作者の [twpayne/dotfiles](https://github.com/twpayne/dotfiles) と[公式ドキュメント](https://www.chezmoi.io/)を参考にしました。自分の構成から、複数マシン運用で効いているところだけ紹介します。

ソースリポジトリの構造は、ここで触れるものだけ抜き出すとこの形です。

```text
~/.local/share/chezmoi/          # リポジトリ (.chezmoiroot で home/ に寄せている)
└── home/
    ├── .chezmoi.toml.tmpl       # マシン属性の自動判定
    ├── .chezmoiignore           # マシンごとの配布制御
    ├── .chezmoiscripts/         # run_onchange_after_mise-install.sh.tmpl など
    ├── dot_Brewfile.tmpl        # → ~/.Brewfile
    ├── dot_claude/              # → ~/.claude
    ├── private_dot_config/      # → ~/.config (fish / mise / git / atuin ...)
    └── windows/                 # WSL 用 (Windows Terminal 設定)
```

### マシン属性の自動判定

3 環境を 1 ソースで扱うため、`.chezmoi.toml.tmpl` でマシン属性（会社マシンか、WSL か、headless か）を hostname や環境変数から自動判定しています。会社マシンの判定に使う hostname の正規表現は環境変数経由で渡して、パターン自体はリポジトリに残しません。

```text
{{- /* Work hostname: regex supplied via env to keep pattern out of the repo */ -}}
{{- $work_regex := env "CHEZMOI_WORK_HOSTNAME_REGEX" -}}
{{- if $work_regex -}}
{{-   if regexMatch $work_regex .chezmoi.hostname -}}
{{-     $work = true -}}
{{-   end -}}
{{- end -}}
```

判定した属性は、テンプレートの分岐や `.chezmoiignore` での配布制御に使います。会社マシンにだけ証明書設定を配る、私用マシンにだけ特定の env を配る、といった出し分けがここで決まります。

### Brewfile を single source of truth に

Mac のパッケージは Brewfile を唯一の正として、`chezmoi apply` のたびに `run_onchange` スクリプトで同期しています。

1. `brew bundle` — Brewfile にあるものをインストール
2. `brew bundle cleanup --force` — Brewfile にないものをアンインストール

手で `brew install` したものは、Brewfile に書かない限り次の apply で消えます。破壊的ですが、おかげで「リポジトリに書いてあるものがすべて」という状態が保たれて、マシン間の差分に悩まなくなりました。

## 課題

環境セットアップに凝ってしまうことです。Claude に聞けば改善ネタはいくらでも出てくるので、気づくと dotfiles をいじること自体が目的になってきます。月 30〜65 commits という数字も、裏返せばそれだけの時間を環境整備に使っているということです。開発環境はあくまで開発のためのものなので、ほどほどにするべきだと思っています（自戒）。

## やってみたい人へ

導入手順は[公式ドキュメント](https://www.chezmoi.io/)が丁寧なので、そちらを見るのが早いです。構成の実例は [twpayne/dotfiles](https://github.com/twpayne/dotfiles) が参考になります。

最初から全部を管理しようとしなくても、1 ファイルを `chezmoi add` するところから始められます。あとは気になったら Claude へ「この構成、今ならどうする？」と聞く。自分の場合はこのやり方で 4 ヶ月半続いています。
