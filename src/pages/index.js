import { graphql } from 'gatsby'
import get from 'lodash/get'
import React from 'react'

import Meta from 'components/atoms/meta'
import Article from 'components/organisms/article'
import Layout from 'components/templates/layout'

const BlogIndex = ({ data }) => {
  const posts = get(data, 'remark.posts')
  const site = get(data, 'site.meta')
  return (
    <Layout>
      <Meta site={site} />
      {posts.map(({ post }, i) => (
        <Article
          key={i}
          frontmatter={get(post, 'frontmatter')}
          html={get(post, 'html')}
          site={site}
          options={{ isIndex: true }}
        />
      ))}
    </Layout>
  )
}

export default BlogIndex

export const pageQuery = graphql`
  query IndexQuery {
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
    remark: allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
    ) {
      posts: edges {
        post: node {
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
              }
            }
          }
        }
      }
    }
  }
`
