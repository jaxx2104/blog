---
title: AWS SDK for PHP2 を使って S3 に画像をアップしてみた
created_at: "2013-11-29T23:58:21+00:00"
updated_at: "2013-11-29T23:58:21+00:00"
path: /aws-sdk-for-php2-s3-imageupload
category: AWS
tags:
  - PHP
  - Twitter
---

AWS 登録してみたのでさっそく触ってみました。

登録には携帯番号やクレジットカードが必要でした。

AWS の操作は以下４つの方法がある。

- AWS Management Console
- AWS SDK
- AWS CLI
- AWS Query API

## AWS Management Console

AWS の Web 管理画面上で手動にて操作を行う。

<!--more-->

## AWS SDK

SDK をインストールすることで、プログラムによって自動化したりできる。

## AWS CLI

AWS Management Console をローカルで操作できます。

## AWS Query API

HTTP リクエストを使って操作する。アクセスする際の署名が少々煩わしい。

## サンプル

今回は AWS SDK for PHP 2 を使って S3 に画像をアップしてみます。

```php
class SampleAws {
  // Amazon SDKのインスタンス
  private $obj = null;

  /**
   * AWS にアクセスする際の鍵
   * @return {object} instance
   */
  public function getInstance() {
    if (is_null($this->obj)) {
      $this->obj = Aws::factory(array(
        'key'    => 'XXXXXXXXXXXXX',
        'secret' => 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'region' => 'ap-northeast-1'
      ))->get('s3');
    }
    return $this->obj;
  }

  /**
   * s3に画像を保存
   * @return {object} EndpointArns 全てのエンドポイント
   */
  public function putObjectTest($tempFileName){
    $this->getInstance()->putObject(array(
      'Bucket' => 'jaxx2104',
      'Key'    => $tempFileName,
      'Body' => EntityBody::factory(fopen($tempFileName, 'r')),
    ));
  }
}
```

今回の勉強会でライトニングトークやらせていただいたので、その時のスライドを載せときます。
