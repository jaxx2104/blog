"use client"

import React from "react"
import Link from "next/link"
import styled from "styled-components"

import Badges from "@/components/ui/badge"
import Heading from "@/components/ui/heading"
import Time from "@/components/ui/time"

interface Props {
  path: string
  title: string
  created_at: string
  categories: string[] | null
  tags: string[] | null
}

const ArticleInfo: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
}: Props) => (
  <InfoWrap>
    <Link
      style={{ textDecoration: "none", display: "block", margin: "0.5rem 0" }}
      href={path}
    >
      <Heading>{title}</Heading>
    </Link>
    <div style={{ margin: "0.5rem 0", display: "flex", columnGap: "0.5rem" }}>
      <Time created_at={created_at} />
      <Badges items={categories} primary />
      <Badges items={tags} />
    </div>
  </InfoWrap>
)

export default ArticleInfo

const InfoWrap = styled.div`
  display: flex;
  margin: 2rem 0 1rem;
  flex-direction: column;
  justify-content: center;
  word-break: break-word;
`
