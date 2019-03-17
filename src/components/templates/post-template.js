import { graphql } from 'gatsby'
import get from 'lodash/get'
import React from 'react'

import Meta from 'components/atoms/meta'
import Article from 'components/organisms/article'
import Layout from 'components/templates/layout'

const PostTemplate = ({ data }) => (
  <div>
    <Layout>
      <Meta
        image={get(data, 'post.frontmatter.image.childImageSharp.sizes.src')}
        path={get(data, 'post.frontmatter.path')}
        site={get(data, 'site.meta')}
        title={get(data, 'post.frontmatter.title')}
      />
      <Article
        frontmatter={get(data, 'post.frontmatter')}
        html={get(data, 'post.html')}
        site={get(data, 'site.meta')}
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
        image {
          childImageSharp {
            fluid(maxWidth: 700) {
              ...GatsbyImageSharpFluid_withWebp_tracedSVG
            }
            sizes {
              src
            }
          }
        }
      }
    }
  }
`
