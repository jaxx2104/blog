import React from "react"
import { graphql } from "gatsby"
import { FluidObject } from "gatsby-image"
import { PostByPathQuery } from "../../types/graphql-types"
import Article, {
  FrontFormatter,
  SiteMetaType,
} from "../containers/article/article"
import Layout from "../containers/template"
import Meta from "../components/meta"

interface Props {
  data: PostByPathQuery
}

const PostTemplate = ({ data }: Props) => {
  const frontmatter = data.post?.frontmatter
  const site = data.site?.meta as SiteMetaType
  const image = frontmatter?.image?.childImageSharp?.sizes?.src

  return (
    <Layout>
      <Meta
        image={image}
        path={frontmatter?.path || ""}
        site={site}
        title={frontmatter?.title || ""}
      />
      <Article
        frontmatter={frontmatter as FrontFormatter}
        image={frontmatter?.image?.childImageSharp?.fluid as FluidObject}
        html={data.post?.html || ""}
        site={site}
        options={{
          isIndex: false,
          adsense: site?.adsense,
        }}
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
