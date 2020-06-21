import React from "react"
import Link from "gatsby-link"
import styled from "styled-components"

import Badges from "../../components/badges"
import Heading from "../../components/heading"
import Time from "../../components/time"

interface Props {
  path: string
  title: string
  date: string
  categories: string[] | null
  tags: string[] | null
}

const ArticleInfo: React.FC<Props> = ({
  path,
  title,
  date,
  categories,
  tags,
}: Props) => (
  <InfoWrap>
    <Link style={{ textDecoration: "none" }} to={path}>
      <Heading>{title}</Heading>
      <Time date={date} />
      <Badges items={categories} primary />
      <Badges items={tags} />
    </Link>
  </InfoWrap>
)

export default ArticleInfo

const InfoWrap = styled.div`
  margin: 2rem 0;
  word-break: break-word;
`
