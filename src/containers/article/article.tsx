import React from "react"
import Img, { FluidObject } from "gatsby-image"
import { siteMetadata } from "../../../gatsby-config"
import Button from "../../components/button"
import Container from "../../components/container"
import Share from "../../components/icon/icon-share"
import ArticleAd from "./article-ad"
import ArticleInfo from "./article-info"

type Options = { isIndex: boolean; adsense?: string }

export type SiteMetaType = typeof siteMetadata

export type FrontFormatter = {
  title: string
  path: string
  layout: string
  category: string
  tags: string[]
  description: string
  date: string
}
interface Props {
  frontmatter: FrontFormatter
  image: FluidObject | FluidObject[] | undefined
  html: string
  site: SiteMetaType
  options: Options
}

const getDescription = (body: string) => {
  const [description] = body.split("<!--more-->")
  return description
}

const Article: React.FC<Props> = ({
  frontmatter,
  image,
  html,
  site,
  options,
}: Props) => {
  const { isIndex, adsense } = options
  const isMore = isIndex && !!html.match("<!--more-->")
  const { path, title, date, category, tags, description } = frontmatter

  return (
    <Container>
      <ArticleInfo
        path={path}
        title={title}
        date={date}
        categories={[category]}
        tags={tags}
      />
      <div className="content">
        <p>{description}</p>
        {image ? <Img fluid={image} /> : ""}
      </div>
      <div
        className="content"
        dangerouslySetInnerHTML={{
          __html: isMore ? getDescription(html) : html,
        }}
      />
      <div className="content">
        {isMore ? <Button path={path} label="MORE" primary /> : ""}
      </div>
      {!isIndex && (
        <>
          <Share url={`${site.siteUrl}${path}`} title={title} />
          <ArticleAd clientId={adsense} slotId="" format="auto" />
        </>
      )}
    </Container>
  )
}

export default Article
