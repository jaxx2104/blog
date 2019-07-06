---
title: Zabbix と AWS SES による死活監視とアラートメールの送信方法
date: "2014-01-26T14:50:56+00:00"
author: jaxx2104
layout: post
path: /zabbix-aws-ses
category: AWS
tags:
  - Emacs
  - Mac
  - PHP
---

## Zabbix のメールスクリプトを設置

参考 : http://www.zabbix.jp/node/1441

```
# cd /usr/local/src/
# git clone git://github.com/zabbix-jp/plugins.git
# mv plugins zabbix-jp-plugins
# cp -a /usr/local/src/zabbix-jp-plugins/notification/sendmessage-smtp-php /etc/zabbix/alertscripts/
# chmod 755 /etc/zabbix/alertscripts/sendmessage-smtp-php/sendmessage_smtp_php.sh
```

<!--more-->

## メールスクリプトの設定

メールスクリプトの SMTP 認証の設定をします。

AWS コンソールから各項目の値を取得できます。HOST のポート番号は 465 です。

また動作しない場合は \$mailer->SMTPDebug = 1; と追加することで、

デバッグモードを有効にしてエラーを知ることもできます。

```
# emacs /var/lib/zabbix/sendmessage-smtp-php/sendmessage_smtp_php.sh
```

> \$MAIL_SMTP_HOST = &#8216;email-smtp.us-east-1.amazonaws.com:465&#8217;;

> \$MAIL_SMTP_USER = &#8216;SMTP-USERNAME&#8217;;

> \$MAIL_SMTP_PASS = &#8216;SMTP-USERPASS&#8217;;

> \$mailer->SMTPDebug = 1;

Zabbix の設定ファイルにメールスクリプトのパスを記します。

```
# emacs /var/lib/zabbix/zabbix_server.conf
```

> AlertScriptsPath=/etc/zabbix/alertscripts

## コマンドで確認

```
php sendmessage-smtp-php/sendmessage_smtp_php.sh mail@sample.com title body
```

success が返れば成功

php の OpenSSL が有効になっていないと怒られたので、

-with-openssl 追加し再コンパイルし直し。その後受信確認できました。

## スクリプトを登録

あとは通常通り Zabbix の管理画面からスクリプトを登録します、

管理 -> メディアタイプ -> メディアタイプの作成をクリックし、

- 説明 : sendmessage_smtp_php.sh
- タイプ : スクリプト
- 名前 : sendmessage_smtp_php/sendmessage_smtp_php.sh

と入力し登録。ユーザーとアクションを設定すれば完了です。
