"use client"

import React from "react"
import Container from "@/components/ui/Container"
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
