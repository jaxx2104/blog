import Img from 'gatsby-image'
import React from 'react'
import get from 'lodash/get'

import Button from 'components/atoms/Button'
import Adsense from 'components/molecules/Adsense'
import Container from 'components/molecules/Container'
import Share from 'components/molecules/Share'
import PostInfo from 'components/organisms/Info'

const Article = ({ frontmatter, html, site, options }) => {
  const { isIndex, adsense } = options
  const isMore = isIndex && !!html.match('<!--more-->')
  const fluid = get(frontmatter.image, 'childImageSharp.fluid')
  return (
    <Container>
      <PostInfo
        path={frontmatter.path}
        title={frontmatter.title}
        date={frontmatter.date}
        categories={[frontmatter.category]}
        tags={frontmatter.tags}
      />
      <div className="content">
        <p>{frontmatter.description}</p>
        {fluid ? <Img fluid={fluid} /> : ''}
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: isMore ? getDescription(html) : html,
        }}
      />
      <div className="content">
        {isMore ? <Button path={frontmatter.path} label="MORE" primary /> : ''}
      </div>
      <ShareSection
        isIndex={isIndex}
        url={`${site.url}${frontmatter.path}`}
        title={frontmatter.title}
      />
      <AdSection isIndex={isIndex} adsense={adsense} />
    </Container>
  )
}

export default Article

const AdSection = ({ isIndex, adsense }) => {
  return !isIndex ? <Adsense clientId={adsense} slotId="" format="auto" /> : ''
}
const ShareSection = ({ isIndex, url, title }) => {
  return !isIndex ? <Share url={url} title={title} /> : ''
}

const getDescription = body => {
  if (body.match('<!--more-->')) {
    body = body.split('<!--more-->')
    if (typeof body[0] !== 'undefined') {
      return body[0]
    }
  }
  return body
}
