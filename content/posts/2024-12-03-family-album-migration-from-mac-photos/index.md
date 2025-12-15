---
title: 家族アルバムを脱 Mac Photos した
created_at: '2024-12-03T13:49:28.000Z'
updated_at: '2024-12-03T14:57:26.000Z'
path: /family-album-migration-from-mac-photos
category: Scrapbox
tags:
  - imported
  - scrapbox
---
Mac の Photos アプリを家族アルバムとして使っていた
が 2TB を超えたあたりで限界になって写真管理を Windows マシンに移行したので備忘録

![](./cf426f4c05881b4db3f87fa8bf683848.jpg)


なぜ Mac の Photos を使っていたか
- iPhone を使っていたので Live Photos の機能が使えた
- 一眼の RAW 画像や 4K の動画を一緒に一覧表示できてパフォーマンスもよかった

総ファイルサイズが 2TB になってしまっていた
- ズボラ運用なので写真の整理などはしていなかった
- iPhone の写真は Live Photos を有効にして保存していた
- 一眼についても RAW+JPEG で保存していた

どんな構成だったか
- iPhone、一眼で写真や動画を撮る
- Mac の Photos で保存
- 毎回、外付けの SSD2TB に保存（1 次保管）
- 毎月、ホームサーバー40TB に保存（2 次保管）
- 毎月、Google Photo へ圧縮画像を自動アップロード（共有用）
- 毎月、AWS S3 へ自動アップロード（クラウドバックアップ）
- ちなみに iCloud は 2TB になるとお高いので使っていない

今回限界がきたのは SSD の部分がきっかけ
- SSD が 4 年目にしてセクターが壊れるトラブル
  - バックアップから復旧は可能だったが直近で撮影した写真をできれば復旧したかった
- SSD を APFS フォーマットにしていたのが原因でリカバリに苦戦
  - APFS フォーマットは速度面で良かったがリカバリする際にツールの選択肢が少なかった
  - Mac Photos を使う場合でも exFAT にするのが無難

SSD の故障きっかけで見直したこと
- Mac Photos
  - macOS Catalina 前までは管理しているフォルダが日付ごとに整理されていて Photos を介さなくても中身を取り出すのが容易だったが、Catalina 以降からフォルダ構成が「0」〜「F」までにランダムに保存されるようになった。なので日付や Exif 情報や XMP に保存するメタデータは Photos の SQLite で管理されるようになった。ファイルベースではないのでパフォーマンス面での恩恵があったが Photos からでないとオリジナル写真を取り出せないので、若干気持ちが悪かった。
  - 写真の整理という点でも、近似値をさがして重複やグルーピングして選別といった機能が欲しいなと思ったのと、不要な Live Photos の一括削除、RAW+JPEG の JPEG 削除といった機能が欲しいと思ったが、Mac Photos はそういった機能がなく、ファイルサイズがひたすら増えてしまうのが不満だった。

移行
- Mac Photos から Windows の Capture One https://www.captureone.com/ja への乗り換え（GPU の恩恵も受けることが出来る）
  - Live Photos さえ諦めれば、写真選別機能やこまかい絞り込み機能など便利な点が多い
  移行するときに Mac Photos の書き出し https://support.apple.com/ja-jp/guide/photos/pht6e157c5f/mac を介さないといけない & 細かい条件で書き出しできないのがとても不便だったが osxphotos という OSS を見つけた、Live Photos は移行しない、RAW だけ移行、リトライ機構など細かく設定できて便利だった。

写真なら
```shell
osxphotos export /Volumes/Share/20241201 --only-photos --post-command-error continue --export-by-date  --year 2023 --skip-edited --retry 3 --sidecar XMP --sidecar-drop-ext --library /Volumes/Share/20241118/写真\ Library.photoslibrary
```

動画なら

```shell
osxphotos export /Volumes/Share/20241201 --only-movies --post-command-error continue --min-size 6MB --export-by-date  --year 2023 --skip-edited --retry 3 --sidecar XMP --sidecar-drop-ext --library /Volumes/Share/20241118/写真\ Library.photoslibrary
```


