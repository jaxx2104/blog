import React from 'react'
import Helmet from 'react-helmet'
import get from 'lodash/get'

import { siteMetadata } from '../../../gatsby-config'

const Meta = ({ site, data }) => {
  const postTitle = get(data, 'frontmatter.title')
  const siteTitle = get(site, 'title')
  const title = data ? `${postTitle} | ${siteTitle}` : siteTitle

  return (
    <Helmet
      title={title}
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
          content: get(siteMetadata, 'description'),
        },
        {
          property: 'og:url',
          content: `${get(siteMetadata, 'siteUrl')}/profile`,
        },
        {
          property: 'og:image',
          content: `${get(siteMetadata, 'siteUrl')}/img/profile.jpg`,
        },
      ]}
    />
  )
}
export default Meta
