import get from 'lodash/get'
import React from 'react'

import Meta from 'components/atoms/Meta'
import Article from 'components/organisms/Article'

const PostTemplate = ({ data }) => {
  return (
    <div>
      <Meta data={get(data, 'post')} site={get(data, 'site')} />
      <Article
        data={get(data, 'post')}
        site={get(data, 'site')}
        isIndex={false}
      />
    </div>
  )
}

export default PostTemplate

export const pageQuery = graphql`
  query PostByPath($path: String!) {
    site {
      meta: siteMetadata {
        title
        description
        url: siteUrl
        author
        twitter
        adsense
      }
    }
    post: markdownRemark(frontmatter: { path: { eq: $path } }) {
      id
      html
      frontmatter {
        layout
        title
        path
        categories
        date(formatString: "YYYY/MM/DD")
      }
    }
  }
`
