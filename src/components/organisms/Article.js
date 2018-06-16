import React from 'react'

import Button from 'components/atoms/Button'
import Adsense from 'components/molecules/Adsense'
import Container from 'components/molecules/Container'
import PostInfo from 'components/organisms/Info'

const Article = ({ site, data, isIndex }) => {
  const {
    category,
    categories,
    description,
    title,
    path,
    date,
  } = data.frontmatter

  const html = data.html
  const isMore = isIndex && !!html.match('<!--more-->')

  return (
    <Container>
      <PostInfo
        path={path}
        title={title}
        date={date}
        categories={category || categories}
      />
      {getAd(isIndex, site)}
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: isMore ? description || getDescription(html) : html,
        }}
      />
      {isMore ? <Button path={path} label="MORE" /> : ''}
      {getAd(isIndex, site)}
    </Container>
  )
}

export default Article

const getAd = (isIndex, site) => {
  return !isIndex ? (
    <Adsense clientId={site.meta.adsense} slotId="" format="auto" />
  ) : (
    ''
  )
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
