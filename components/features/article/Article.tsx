"use client"

import React from "react"
import Container from "@/components/ui/Container"
import Share from "@/components/icons/icon-share"
import ArticleInfo from "@/components/features/article/ArticleInfo"

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
  created_at: string
  categories: string[] | null
  tags: string[] | null
  html: string
  site: SiteMetaType
}

const Article: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
  html,
  site,
}: Props) => {
  return (
    <Container>
      <ArticleInfo
        path={path}
        title={title}
        created_at={created_at}
        categories={categories}
        tags={tags}
      />
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
