import React from 'react'
import styled from 'styled-components'

import Adsense from 'components/molecules/Adsense'
import PostInfo from 'components/organisms/Info'
import PostMore from 'components/molecules/More'

const Container = styled.div`
  margin: 0 auto;
  max-width: 960px;
`

const Article = styled.div`
  padding: 1rem;
`

const Content = styled.div`
  color: #495057;
  line-height: 1.8;
  font-size: 1rem;
  padding: 1rem 2rem;
`

const Post = ({ site, data, isIndex }) => {
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
      <Article>
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
        {isMore ? <PostMore path={path} /> : ''}
        {getAd(isIndex, site)}
      </Article>
    </Container>
  )
}

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

export default Post
