---
id: 798
title: CentOSにLAMP環境構築からWordPressインストールまでの手順
date: "2013-12-05T00:56:38+00:00"
author: jaxx2104
layout: post
guid: http://jaxx2104.info/?p=798
path: /centos-lamp-wordpress-step
dsq_thread_id:
  - "2024174432"
categories:
  - CentOS
  - Linux
tags:
  - apache
  - CentOS
  - Emacs
  - Mac
  - PHP
  - WordPress
---
LAMP 環境構築を数ヵ月ぶりにやったらいろいろと変更している部分があったので更新。

WordPress のインストールは実際の作業ではやっていないので少し省いてます。

## CentOS バージョン確認

サーバに CentOS をインストールしたらバージョンを確認します。

> $ rpm -qa | grep centos-release

## yum アップデート

> $ yum -y update

## 開発ツール一式

必要最小限の構成の場合は一つ一つ入れますが今回は一気にインストールします。CentOS6 の場合「開発ツール」の後ろ全角スペースが必要でした注意してください。

<!--more-->

```sh
$ yum -y groupinstall “開発ツール　”
$ yum groupinfo “開発ツール　”
```

## Emacs,get,tree 追加

テキストエディタは Emacs を使用しているで、この段階で必要なものをインストールします。

```sh
$ yum -y install emacs
$ yum -y install get
$ yum -y install tree
```

## SELINUX 確認・無効

SELINUX は無効にします。SELINUX とは、なぜ無効にするかは調べてください。

```sh
$ getenforce
$ setenforce 0
$ emacs /etc/sysconfig/selinux
```

```sh
SELINUX=disabled
```

## 日本語環境

日本語環境にしますが、個人の気分だと思います

```sh
$ emacs /etc/sysconfig/i18n
```

```conf
LANG="ja_JP.UTF-8"
SYSFONT="latarcyrheb-sun16"
```

## NTP

NTP を使ってサーバの時刻合わせを行います。

```sh
$ yum -y install ntp
$ emacs /etc/ntp.conf
```

```conf
restrict 192.168.1.0 mask 255.255.255.0 nomodify notrap
server ntp.nict.jp
server ntp.jst.mfeed.ad.jp
```

サービスの開始・自動起動

```sh
$ /etc/rc.d/init.d/ntpd start
$ chkconfig ntpd on
$ ntpq -p
```

## ユーザーの作成

```sh
$ useradd ユーザー名
$ passwd ユーザー名
```

ポート番号設定と root でのログインを禁止

```sh
$ emacs /etc/ssh/sshd_config
```

```conf
Port XXX.XXX.XXX.XXX;
PermitRootLogin No;
```

## ipテーブルs

SH、HTTP、HTTPS、POP3、SMTP、サブミッションポートのみ通す。ssh のポート番号は先ほど指定したもの

```sh
$ emacs /etc/sysconfig/iptables
```

```conf
*filter
:INPUT ACCEPT [0:0]
:FORWARD ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:RH-Firewall-1-INPUT - [0:0]
-A INPUT -j RH-Firewall-1-INPUT
-A FORWARD -j RH-Firewall-1-INPUT
-A RH-Firewall-1-INPUT -i lo -j ACCEPT
-A RH-Firewall-1-INPUT -p icmp --icmp-type any -j ACCEPT
-A RH-Firewall-1-INPUT -p 50 -j ACCEPT
-A RH-Firewall-1-INPUT -p 51 -j ACCEPT
-A RH-Firewall-1-INPUT -p udp --dport 5353 -d 224.0.0.251 -j ACCEPT
-A RH-Firewall-1-INPUT -p udp -m udp --dport 631 -j ACCEPT
-A RH-Firewall-1-INPUT -p tcp -m tcp --dport 631 -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport XXXX -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 80 -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 20 -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 21 -j ACCEPT
-A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 3306 -j ACCEPT
-A RH-Firewall-1-INPUT -j REJECT --reject-with icmp-host-prohibited
COMMIT
```

再起動して有効化
```sh
$ /etc/rc.d/init.d/iptables restart
```

## 不要なサービスの停止(ip6テーブルs)

```sh
$ /etc/rc.d/init.d/ip6tables stop
$ chkconfig ip6tables off
```

## yum リポジトリ追加

yum リポジトリダウンロード

```sh
$ wget http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm

（無い場合：http://dl.fedoraproject.org/pub/epel/6/x86_64/ からepal検索）

$ wget http://rpms.famillecollet.com/enterprise/remi-release-6.rpm

（無い場合：http://rpms.famillecollet.com/ から検索）

$ wget http://pkgs.repoforge.org/rpmforge-release/rpmforge-release-0.5.3-1.el6.rf.x86_64.rpm

（無い場合：http://dag.wieers.com/rpm/packages/rpmforge-release/から検索）
```

yum リポジトリ追加
```sh
$ rpm -Uvh epel-release-6-8.noarch.rpm remi-release-6.rpm rpmforge-release-0.5.3-1.el6.rf.x86_64.rpm
```

追加したリポジトリを明示的に指定した時のみ使用

```sh
$ emacs /etc/yum.repos.d/epel.repo
$ emacs /etc/yum.repos.d/rpmforge.repo
```

```conf
enabled=0
```

## LAMP環境構築

この一行で一式をインストールするので不要なものは削ってください。
```sh
$ yum -y -enablerepo=remi,epel,rpmforge install httpd-devel php-cli php-fpm php-devel php-gd php-mbstring php-mysql php-pdo php-pear php mysql-server phpMyAdmin vsftpd
```

## Appache
```sh
$ emacs /etc/httpd/conf/httpd.conf
```

```conf
HTTPレスポンスヘッダのServerヘッダの情報を最小限にする
#ServerTokens OS
ServerTokens Prod

エラーページに表示されるメールアドレスを設定。エラーがあった際はここに設定したメールアドレスに通知がいく
#ServerAdmin root@localhost
ServerAdmin webmaster@linuxserver.jp

サーバーの名前を設定
#ServerName www.example.com:80
ServerName XX.XX.XX.XX:80

DocumentRootを設定
DocumentRoot /var/www/html

Indexes ファイルが指定されていない時にファイル一覧表示
FollowSymLinks シンボリックリンクの許可
Includes SSIを有効にする
ExecCGI CGIの実行を許可
#Options Indexes FollowSymLinks
Options ExecCGI FollowSymLinks Includes

ディレクトリごとに「.htaccess」を使用できるようにする。
#AllowOverride None
AllowOverride ALL
Order allow,deny
Allow from all

.html・.php・.cgiの内のいずれかがディレクトリ内にある場合、先に記述したファイル名から順に検索され表示される。
#DirectoryIndex index.html index.html.var
DirectoryIndex index.html index.php index.cgi

エラーページ等でApacheのバージョンを表示しないようにする
#ServerSignature On
ServerSignature Off

デフォルトで文字コードを指定しないようにする
AddDefaultCharset UTF-8
#AddDefaultCharset UTF-8
```

ドキュメントルートの所有者を変更
```sh
$ chown user:group /var/www/html/
```

サービス開始
```sh
$ /sbin/chkconfig httpd on
$ /etc/rc.d/init.d/httpd start
$ /sbin/chkconfig -list httpd
```

## sftp
```sh
$ emacs /etc/vsftpd/vsftpd.conf
```

編集
```conf
anonymous_enable=NO
ascii_upload_enable=YES
```

追加

```conf
ascii_download_enable=YES
text_userdb_names=YES
use_localtime=YES
```

サービスの開始・自動起動
```sh
$ /etc/rc.d/init.d/vsftpd start
$ chkconfig vsftpd on
```

## MySQL
```sh
$ emacs /etc/my.cnf
```

追加
```conf
[mysqld]
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
user=mysql
# Disabling symbolic-links is recommended to prevent assorted security risks
symbolic-links=0
default-character-set = utf8
skip-character-set-client-handshake
character-set-server = utf8
collation-server = utf8_general_ci
init-connect = SET NAMES utf8
[client]
default-character-set = utf8
[mysqldump]
default-character-set = utf8
[mysql]
default-character-set = utf8
[mysqld_safe]
log-error=/var/log/mysqld.log
pid-file=/var/run/mysqld/mysqld.pid
```

サービス開始
```sh
$ /etc/rc.d/init.d/mysqld start
$ mysql\_install\_db
$ chkconfig mysqld on
$ mysql\_secure\_installation
```

以下の質問に答える

```sh
既存password（デフォルトは空）
新規password
yes
```

## php
```sh
$ emacs /etc/php.ini
```

```sh
mbstring.language = Japanese
```

## phpmyadmin

BASIC 認証の場合
```sh
$ emacs /etc/httpd/conf.d/phpMyAdmin.conf
```

```conf
<Directory "/usr/share/phpmyadmin">
  Options FollowSymLinks
  AllowOverride All
  Order Deny,Allow
  Deny from all
  Allow from 127.0.0.1
  Allow from 192.168.11.
</Directory>
```

確認
```sh
$ /etc/rc.d/init.d/httpd restart
```
basic 認証のパスワードは MySQL の root パスワード

## WordPress

WordPress 用 MySQL ユーザーの作成

```sh
$ mysql -uroot -p
$ create database データベース名
```

```sql
grant create,select,insert,update,delete on (作成したDB名).* to 'ユーザ名'@'ホスト名' identified by 'パスワード'
flush privileges;
```

以上で LAMP 環境構築から WordPress インストールまで完了です。

だいぶ省いている箇所もあるので参考程度にと思っています。

conf ファイルなどの細かな設定は使用状況に合わせて検討してください。
