import get from 'lodash/get'
import React from 'react'
import Helmet from 'react-helmet'
import { siteMetadata } from '../../../gatsby-config'

class Yomu extends React.Component {
  render() {
    const pathPrefix =
      process.env.NODE_ENV === 'development' ? '' : __PATH_PREFIX__
    const title = 'Yomu'

    return (
      <div>
        <Helmet
          title={`${title} | ${get(siteMetadata, 'title')}`}
          meta={[
            { name: 'twitter:card', content: 'summary' },
            {
              name: 'twitter:site',
              content: `@${get(siteMetadata, 'twitter')}`,
            },
            { property: 'og:title', content: title },
            { property: 'og:type', content: 'website' },
            {
              property: 'og:description',
              content:
                'Yomuは「キュレーション無く、好きな記事を読む」をコンセプトに、日本で作られたRSSリーダーです。',
            },
            {
              property: 'og:url',
              content: `${get(siteMetadata, 'siteUrl')}/yomu`,
            },
            {
              property: 'og:image',
              content: `${get(siteMetadata, 'siteUrl')}/img/yomu.jpg`,
            },
          ]}
        />
        <section
          className="jumboimage text-center"
          style={{
            backgroundImage: `url(${pathPrefix}/img/yomu.jpg)`,
          }}
        >
          <h1 className="display-1">Yomu</h1>
        </section>

        <section className="" id="about">
          <div className="container">
            <div className="row">
              <div className="col-lg-9">
                <p className="text-muted text-left">
                  Yomuは「キュレーション無く、好きな記事を読む」をコンセプトに、日本で作られたRSSリーダーです。
                  <br />
                  格子状の画面でサイトを横断して記事を読むことが出来ます。切り替え機能により2種類のグループに分けることも可能です。
                  お気に入りのサイトやブログを登録してあなただけのリーダーを作成してください。
                  詳細画面では上下のスワイプで読む閉じるができ大画面の端末でも片手で操作出来るように設計しています。
                </p>
                <p className="text-muted text-left">
                  ご意見・レビュー等いただけると有り難いです。
                </p>
              </div>
              <div className="col-lg-3">
                <a
                  href="https://geo.itunes.apple.com/us/app/yomu-rss-reader/id924321598?mt=8"
                  style={{
                    display: 'inline-block',
                    overflow: 'hidden',
                    background:
                      'url(https://linkmaker.itunes.apple.com/images/badges/en-us/badge_appstore-lrg.svg) no-repeat',
                    width: '165px',
                    height: '40px',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary text-white text-center" id="concept">
          <div className="container">
            <div className="row">
              <div className="col-lg-12 text-center">
                <h2 className="section-heading">Detail </h2>
                <hr className="light" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-md-6 slide-left" data-emergence="hidden">
                <img src={pathPrefix + '/img/yomu1.png'} />
              </div>
              <div className="col-md-6 slide-right" data-emergence="hidden">
                <img src={pathPrefix + '/img/yomu2.png'} />
              </div>
            </div>
          </div>
        </section>
        <section id="features">
          <div className="container">
            <div className="row">
              <div className="col-lg-12 text-center">
                <h2 className="section-heading">Features</h2>
                <hr className="border-primary" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-th-large text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Grid Layout</h5>
                  <small className="text-muted">
                    格子状の画面で横断して記事を読むことが出来ます。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-hand-paper-o text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Simple UI</h5>
                  <small className="text-muted">
                    大画面でも片手で操作出来るように設計しました。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-newspaper-o text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Good Typesetting</h5>
                  <small className="text-muted">
                    余計なスタイルを読みやすい文字組みで表示します。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-heart text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Made with Love</h5>
                  <small className="text-muted">
                    アプリの要望に応えてアップデートします。
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }
}

export default Yomu
