import React from "react"
import { graphql } from "gatsby"
import { IGatsbyImageData } from "gatsby-plugin-image"
import Article, { SiteMetaType } from "../article/article"
import Meta from "../../components/meta"
import Layout from "./layout"

interface Props {
  data: GatsbyTypes.PostByPathQuery
}

const PostTemplate = ({ data }: Props) => {
  const site = data.site?.meta as SiteMetaType
  return (
    <Layout>
      <Meta
        image={data.post?.frontmatter?.image?.childImageSharp?.original?.src}
        path={data.post?.frontmatter?.path || ""}
        site={site}
        title={data.post?.frontmatter?.title || ""}
      />
      <Article
        path={data.post?.frontmatter?.path || ""}
        title={data.post?.frontmatter?.title || ""}
        date={data.post?.frontmatter?.date || ""}
        description={data.post?.frontmatter?.description || ""}
        categories={
          data.post?.frontmatter?.category
            ? [data.post?.frontmatter?.category]
            : null
        }
        tags={(data.post?.frontmatter?.tags as string[]) || null}
        image={data.post?.frontmatter?.image?.childImageSharp?.gatsbyImageData}
        html={data.post?.html || ""}
        site={site}
        isIndex={false}
        adsense={site?.adsense}
      />
    </Layout>
  )
}

export default PostTemplate

export const pageQuery = graphql`
  query PostByPath($path: String!) {
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
            gatsbyImageData(
              width: 700
              layout: FULL_WIDTH
              placeholder: TRACED_SVG
            )
            original {
              src
            }
          }
        }
      }
    }
  }
`
