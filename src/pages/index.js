import get from 'lodash/get'
import React from 'react'

import Meta from 'components/atoms/Meta'
import Article from 'components/organisms/Article'
import Layout from 'components/templates/Layout'

const BlogIndex = ({ data }) => {
  const posts = get(data, 'remark.posts')
  return (
    <Layout>
      <Meta site={get(data, 'site.meta')} />
      {posts.map(({ post }, i) => (
        <Article
          data={post}
          options={{
            isIndex: true,
          }}
          key={i}
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
                sizes(quality: 100) {
                  ...GatsbyImageSharpSizes_withWebp
                }
              }
            }
          }
        }
      }
    }
  }
`
