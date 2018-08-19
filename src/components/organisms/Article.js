import Img from 'gatsby-image'
import React from 'react'
import get from 'lodash/get'

import Button from 'components/atoms/Button'
import Adsense from 'components/molecules/Adsense'
import Container from 'components/molecules/Container'
import PostInfo from 'components/organisms/Info'

const Article = ({ data, options }) => {
  const {
    category,
    tags,
    description,
    title,
    path,
    date,
    image,
  } = data.frontmatter
  const { isIndex, adsense } = options
  const html = data.html
  const isMore = isIndex && !!html.match('<!--more-->')
  const sizes = get(image, 'childImageSharp.sizes')
  return (
    <Container>
      <PostInfo
        path={path}
        title={title}
        date={date}
        categories={[category]}
        tags={tags}
      />
      <div className="content">
        <p>{description}</p>
        {sizes ? <Img sizes={sizes} /> : ''}
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: isMore ? getDescription(html) : html,
        }}
      />
      <div className="content">
        {isMore ? <Button path={path} label="MORE" primary /> : ''}
      </div>
      {getAd(isIndex, adsense)}
    </Container>
  )
}

export default Article

const getAd = (isIndex, adsense) => {
  return !isIndex ? <Adsense clientId={adsense} slotId="" format="auto" /> : ''
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
