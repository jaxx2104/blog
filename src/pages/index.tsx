import React from "react"
import { graphql } from "gatsby"
import { FluidObject } from "gatsby-image"
import { IndexPageQuery } from "../../types/graphql-types"
import Article, {
  FrontFormatter,
  SiteMetaType,
} from "../containers/article/article"
import Layout from "../containers/template"
import Meta from "../components/meta"

interface Props {
  data: IndexPageQuery
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
            frontmatter={post.frontmatter as FrontFormatter}
            image={
              post.frontmatter?.image?.childImageSharp?.fluid as FluidObject
            }
            html={post.html || ""}
            site={site}
            options={{ isIndex: true }}
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
