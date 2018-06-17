import React from 'react'
import get from 'lodash/get'
import sortBy from 'lodash/sortBy'

import Meta from 'components/atoms/Meta'
import Article from 'components/organisms/Article'
import Layout from 'components/templates/Layout'

class BlogIndex extends React.Component {
  render() {
    const pageLinks = []
    const site = get(this, 'props.data.site.siteMetadata')
    const posts = get(this, 'props.data.remark.posts')

    const sortedPosts = sortBy(posts, post =>
      get(post, 'post.frontmatter.date')
    ).reverse()

    sortedPosts.forEach((data, i) => {
      const layout = get(data, 'post.frontmatter.layout')
      const path = get(data, 'post.path')
      if (layout === 'post' && path !== '/404/') {
        pageLinks.push(
          <Article data={data.post} site={site} isIndex={true} key={i} />
        )
      }
    })

    return (
      <div>
        <Layout>
          <Meta site={site} />
          {pageLinks}
        </Layout>
      </div>
    )
  }
}

export default BlogIndex

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
        description
        url: siteUrl
        author
        twitter
        adsense
      }
    }
    remark: allMarkdownRemark {
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
