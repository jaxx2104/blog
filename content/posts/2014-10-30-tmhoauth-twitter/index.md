---
title: tmhOAuthを使ってTwitterに画像付きで投稿する
created_at: "2014-10-30T23:06:40+00:00"
updated_at: "2014-10-30T23:06:40+00:00"
path: /tmhoauth-twitter
category: PHP
tags:
  - Twitter API
---

Twitter API を使って画像付きで投稿する場合、ライブラリの tmhOAuth で簡単に認証とリクエスト行うことができます。

> themattharris/tmhOAuth
> https://github.com/themattharris/tmhOAuth

## OAuth 認証

Twitter への認証の際に使う、認証鍵は Twitter Developers にて取得します。

> Twitter Developers
> https://dev.twitter.com/

<!--more-->

認証の際に「Problem with the SSL CA cert」と言われたので、

curl_ssl_verifypeer を一時的に false にしました。

```php
$twConf = array(
    'consumer_key'    => '****************************',
    'consumer_secret' => '**************************************************',
    'user_token'      => '**************************************************',
    'user_secret'     => '*********************************************',
    'curl_ssl_verifypeer' => false
);

require './tmhOAuth.php';
$tmhOAuth = new tmhOAuth($twConf);
```

## 画像を投稿する

試しに、同じ階層にある画像を読んで投稿します。

```php
$image = "/var/www/html/sample.jpg";
$message = "ロボットからの投稿テスト";

$endpoint = $tmhOAuth->url('1.1/statuses/update_with_media');
$imageName  = basename($image);
$params = array(
    'media[]'  => "@{$image};type=image/jpeg;filename={$imageName}",
    'status'   => "{$message}"
);
$code = $tmhOAuth->request('POST', $endpoint, $params, true, true);
if ($tmhOAuth->response["code"] == 200){ // $codeにもステータスは返ってきます
    var_dump($tmhOAuth->response["response"]);
} else {
    var_dump($tmhOAuth->response["error"]);
}
```

ツイートが投稿できました。
