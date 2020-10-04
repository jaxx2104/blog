import React from "react"
import Img, { FluidObject } from "gatsby-image"
import { siteMetadata } from "../../../gatsby-config"
import Button from "../../components/button"
import Container from "../../components/container"
import Share from "../../components/icon/icon-share"
import ArticleAd from "./article-ad"
import ArticleInfo from "./article-info"

export type SiteMetaType = typeof siteMetadata

interface Props {
  path: string
  title: string
  date: string
  description: string
  categories: string[] | null
  tags: string[] | null
  image: FluidObject
  html: string
  site: SiteMetaType
  isIndex: boolean
  adsense: string | null
}

const getDescription = (body: string) => {
  const [description] = body.split("<!--more-->")
  return description
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
  isIndex,
  adsense,
}: Props) => {
  const isMore = isIndex && !!html.match("<!--more-->")

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
        {image && <Img fluid={image} />}
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
          <Share url={`${site.siteUrl}${path}`} title={title || ""} />
          <ArticleAd clientId={adsense} slotId="" format="auto" />
        </>
      )}
    </Container>
  )
}

export default Article
