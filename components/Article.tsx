"use client"

import React from "react"
import Container from "@/src/components/container"
import Share from "@/src/components/icon/icon-share"
import ArticleInfo from "@/components/ArticleInfo"

export interface SiteMetaType {
  title: string
  description: string
  siteUrl: string
  author: string
  twitter: string
}

interface Props {
  path: string
  title: string
  date: string
  description: string
  categories: string[] | null
  tags: string[] | null
  image?: string
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
        {image && <img src={image} alt={title} />}
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
