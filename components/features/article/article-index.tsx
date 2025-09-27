"use client"

import React from "react"
import Container from "@/components/ui/container"
import ArticleInfo from "@/components/features/article/article-info"

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
}

const Article: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
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
    </Container>
  )
}

export default Article
