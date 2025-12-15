---
title: SRE
created_at: '2019-07-10T03:06:00.000Z'
updated_at: '2019-07-10T03:30:07.000Z'
path: /sre
category: Scrapbox
tags:
  - imported
  - scrapbox
---
[** なぜやるのか]
チーム間の摩擦を最小限にするため
プロダクトと共に組織をスケールするため
オーバーヘッドによる苦労をなくす


[** DevOps interface]

Reduce organizational silos
- IT 会社に限らずチーム間の溝が深まり連携ができなくなる現象をサイロ化と呼びます。DevOps ではまず、開発チームと運用チームの壁を壊し、チーム間のコラボレーションを促進します。
Accept failure as normal
- なかなか理解してもらえない事実ですが、あらゆるシステムは必ず壊れます。そのためシステムでエラーが発生するのを前提として設計や運用を計画します。
Implement gradual change
- 変更を小規模にすることにより、導入やロールバック、切り分けが簡単になります。
Leverage tooling and automation
- あらゆるツールと自動化を活用して効率化し、人為的なミスを減らします。
Measure everything
- 全てを測定します。これは上記 4 つの領域の成功させるために重要です。

[** How SRE implement DevOps]

Reduce organizational silos	
- Share Ownership
Accept failure as normal
- Error Budget / Postmortem
Implement gradual change
- Canary Release
Leverage tooling and automation
- Automate common case
Measure everything
- Measure Toil and Reliability

[** SRE Principles]

Embracing Risk

Service Level Objectives
Eliminating Toil
Monitoring Distributed Systems
The Evolution of Automation
Release Engineering
Simplicity

詳細や実践手法は以下の URL
https://landing.google.com/sre/sre-book/toc/index.html

[** Reference]

<https://www.youtube.com/watch?v=uTEL8Ff1Zvk&feature=youtu.be>
<https://www.youtube.com/watch?v=ZcZtU_TiFEM&feature=youtu.be>



https://tech.bizreach.co.jp/posts/240/class_sre_implements_devops/
https://kenjiszk.hatenablog.com/entry/2018/12/24/175116
