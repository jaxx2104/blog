import React from "react"
import { siteMetadata } from "../../../gatsby-config"
import Container from "../../components/container"
import ArticleInfo from "./article-info"

export type SiteMetaType = typeof siteMetadata

interface Props {
  path: string
  title: string
  date: string
  description: string
  categories: string[] | null
  tags: string[] | null
}

const Article: React.FC<Props> = ({
  path,
  title,
  date,
  categories,
  tags,
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
    </Container>
  )
}

export default Article
