import React from "react"
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image"
import { siteMetadata } from "../../../gatsby-config"
import Container from "../../components/container"
import Share from "../../components/icon/icon-share"
import ArticleInfo from "./article-info"

export type SiteMetaType = typeof siteMetadata

interface Props {
  path: string
  title: string
  date: string
  description: string
  categories: string[] | null
  tags: string[] | null
  image: IGatsbyImageData
  html: string
  site: SiteMetaType
}

const Article: React.FC<Props> = ({
  path,
  title,
  date,
  description,
  categories,
  tags,
  image,
  html,
  site,
}: Props) => {
  return (
    <Container>
      <ArticleInfo
        path={path}
        title={title}
        date={date}
        categories={categories}
        tags={tags}
      />
      <div className="content">
        <p>{description}</p>
        {image && <GatsbyImage image={image} alt={title} />}
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
      <Share url={`${site.siteUrl}${path}`} title={title || ""} />
    </Container>
  )
}

export default Article
