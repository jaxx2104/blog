import { graphql } from 'gatsby'
import get from 'lodash/get'
import React from 'react'

import Meta from 'components/atoms/Meta'
import Article from 'components/organisms/Article'
import Layout from 'components/templates/Layout'

const PostTemplate = ({ data }) => (
  <div>
    <Layout>
      <Meta
        title={get(data, 'post.frontmatter.title')}
        image={get(data, 'post.frontmatter.image.childImageSharp.sizes.src')}
        site={get(data, 'site.meta')}
      />
      <Article
        data={get(data, 'post')}
        options={{
          isIndex: false,
          adsense: get(data, 'site.meta.adsense'),
        }}
      />
    </Layout>
  </div>
)

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
        category
        tags
        description
        date(formatString: "YYYY/MM/DD")
        test: image {
          relativePath
        }
        image {
          childImageSharp {
            sizes(quality: 70) {
              ...GatsbyImageSharpSizes_withWebp
            }
          }
        }
      }
    }
  }
`
