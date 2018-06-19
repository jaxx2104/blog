---
title: AWS での死活監視とアラートメールの送信方法
date: "2014-01-24T00:01:44+00:00"
author: jaxx2104
layout: post
path: /aws-alertmail
category: AWS
tags:
  - Twitter API
---

AWS での死活監視とアラートメールの送信方法がいくつかあり、

そのメリット、デメリットについて調べものをしたのでメモ。

## AWS Clowd Watch (AWS 備え付けの監視ツール) を使う

監視からアラートメールまで AWS Console の設定で済む

ログが 2 週間しか残らないため非推奨とのこと。

> [CloudWatch]グラフの確認方法と確認できるグラフ一覧(EC2/ELB/RDS)
> http://dev.classmethod.jp/cloud/aws/cloudwatch-can-be-seen-graph/

> Amazon EC2 編～ EC2 インスタンスを監視するには～
> http://recipe.kc-cloud.jp/archives/258

<!--more-->

## Zabbix + AWS SES (AWS のメールシステム) を使う

監視は Zabbix、アラートメールは AWS SES を使う方法

AWS には ELB や RDS など Zabbix で監視できない項目も多い。

> Zabbix のアラートメールを SES から送信してみた
> http://blog.youyo.info/blog/2013/01/31/sendmail-ses-on-zabbix/

## Zabbix + AWS Clowd Watch + AWS SES を使う

Zabbix サーバ内に AWS SDK を入れて CloudWatch API を利用する方法

ELB など Zabbix から監視できないような ClowdWatch のデータを Zabbix に集積できる。

> Zabbix で AWS/CloudWatch の値を取得してみた。
> http://dev.classmethod.jp/cloud/aws/zabbix-with-cloudwatch/
