import React from "react"
import { graphql } from "gatsby"
import { IGatsbyImageData } from "gatsby-plugin-image"
import Article, { SiteMetaType } from "../containers/article/article"
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
            image={post?.frontmatter?.image?.childImageSharp?.gatsbyImageData}
            html={post?.html || ""}
            site={site}
            isIndex={true}
            adsense={null}
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
                gatsbyImageData(
                  width: 700
                  layout: FULL_WIDTH
                  placeholder: TRACED_SVG
                )
              }
            }
          }
        }
      }
    }
  }
`
