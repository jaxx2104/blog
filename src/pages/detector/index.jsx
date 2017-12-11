import get from 'lodash/get'
import React from 'react'
import Helmet from 'react-helmet'
import { siteMetadata } from '../../../gatsby-config'

class Detector extends React.Component {
  render() {
    const pathPrefix =
      process.env.NODE_ENV === 'development' ? '' : __PATH_PREFIX__
    const title = 'Detector'

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
                'Detectorはカメラアプリでライブフィルターを提供します。あなたも新たな視点でクリエイティブな発見の旅に出ましょう。',
            },
            {
              property: 'og:url',
              content: `${get(siteMetadata, 'siteUrl')}/detector`,
            },
            {
              property: 'og:image',
              content: `${get(siteMetadata, 'siteUrl')}/img/detector.jpg`,
            },
          ]}
        />
        <section
          className="jumboimage text-center"
          style={{
            backgroundImage: 'url(' + pathPrefix + '/img/detector.jpg' + ')',
          }}
        >
          <h1 className="display-1">Detector</h1>
        </section>

        <section className="" id="about">
          <div className="container">
            <div className="row">
              <div className="col-lg-9">
                <p className="text-muted text-left">
                  Detectorはカメラアプリでライブフィルターを提供します。あなたも新たな視点でクリエイティブな発見の旅に出ましょう。
                  <br />
                  フィルターは3種類を用意しました。色や動きに反応したり、画面をタップすることでグラフィックが変化します。
                  撮影者と被写体に双方向のインスタレーション性を持たせることをコンセプトに学生の皆さんとDetector
                  を作成しました。
                </p>
              </div>
              <div className="col-lg-3">
                <a
                  href="https://geo.itunes.apple.com/us/app/detector-live-filter-camera/id1079950455?mt=8"
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
                <img src={pathPrefix + '/img/detector1.png'} />
              </div>
              <div className="col-md-6 slide-right" data-emergence="hidden">
                <img src={pathPrefix + '/img/detector2.png'} />
              </div>
            </div>
          </div>
        </section>
        <section id="features">
          <div className="container">
            <div className="row">
              <div className="col-lg-12 text-center">
                <h2 className="section-heading">Features </h2>
                <hr className="primary" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-camera text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Live Fillter Camera</h5>
                  <small className="text-muted">
                    リアルタイムエフェクトのカメラアプリです。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-eye text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Detect Engine</h5>
                  <small className="text-muted">
                    画像解析にはOpenCVを使用しています。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-bolt text-primary"
                    data-emergence="hidden"
                  />
                  <h5>Good Typesetting</h5>
                  <small className="text-muted">
                    色や動きに反応しグラフィックが変化します。
                  </small>
                </div>
              </div>
              <div className="col-lg-3 col-md-6 text-center">
                <div className="service-box">
                  <i
                    className="fa fa-4x fa-users text-primary "
                    data-emergence="hidden"
                  />
                  <h5>Team Developed</h5>
                  <small className="text-muted">
                    学生の人たちとの共同制作です。
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-dark text-white" id="member">
          <div className="container">
            <div className="row">
              <div className="col-lg-12 text-center">
                <h2 className="section-heading">Member </h2>
                <hr className="border-primary" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="row">
              <div className="col-md-1 text-center" />
              <div className="col-md-2 text-center">
                <img
                  src={pathPrefix + '/img/profile/iwa.jpg'}
                  className="rounded-circle"
                />
                <p className="section-heading">Futoshi Iwashita</p>
              </div>
              <div className="col-md-2 text-center">
                <img
                  src={pathPrefix + '/img/profile/shima.jpg'}
                  className="rounded-circle"
                />
                <p className="section-heading">Eriko Shimada</p>
              </div>
              <div className="col-md-2 text-center">
                <img
                  src={pathPrefix + '/img/profile/iri.jpg'}
                  className="rounded-circle"
                />
                <p className="section-heading">Shun Irie</p>
              </div>
              <div className="col-md-2 text-center">
                <img
                  src={pathPrefix + '/img/profile/aki.jpg'}
                  className="rounded-circle"
                />
                <p className="section-heading">Akito Suzuki</p>
              </div>
              <div className="col-md-2 text-center">
                <img
                  src={pathPrefix + '/img/profile/taru.jpg'}
                  className="rounded-circle"
                />
                <p className="section-heading">Ayaka Tarui</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }
}

export default Detector
