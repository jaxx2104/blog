import React from "react"
import { graphql } from "gatsby"
import Article, { SiteMetaType } from "../containers/article/article-index"
import Layout from "../containers/templates/layout"
import Meta from "../components/meta"

interface Props {
  data: GatsbyTypes.IndexPageQuery
}

const IndexPage: React.FC<Props> = ({ data }: Props) => {
  const posts = data.remark.posts
  const site = data.site?.meta as SiteMetaType
  return (
    <Layout>
      <Meta site={site} />
      {posts.map(({ post }, i) => {
        return (
          <Article
            key={i}
            path={post?.frontmatter?.path || ""}
            title={post?.frontmatter?.title || ""}
            date={post?.frontmatter?.date || ""}
            description={post?.frontmatter?.description || ""}
            categories={
              post?.frontmatter?.category ? [post?.frontmatter?.category] : null
            }
            tags={(post?.frontmatter?.tags as string[]) || null}
          />
        )
      })}
    </Layout>
  )
}

export default IndexPage

export const pageQuery = graphql`
  query IndexPage {
    site {
      meta: siteMetadata {
        title
        description
        siteUrl
        author
        twitter
      }
    }
    image: file(name: { eq: "image" }) {
      childImageSharp {
        gatsbyImageData(
          width: 100
          height: 100
          layout: FIXED
          placeholder: DOMINANT_COLOR
        )
      }
    }
    remark: allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      posts: edges {
        post: node {
          frontmatter {
            layout
            title
            path
            category
            tags
            description
            date(formatString: "YYYY/MM/DD")
          }
        }
      }
    }
  }
`
