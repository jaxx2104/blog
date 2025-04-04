import React from "react"
import { Link } from "gatsby"
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
    <Link
      style={{ textDecoration: "none", display: "block", margin: "0.5rem 0" }}
      to={path}
    >
      <Heading>{title}</Heading>
    </Link>
    <div style={{ margin: "0.5rem 0", display: "flex", columnGap: "0.5rem" }}>
      <Time date={date} />
      <Badges items={categories} primary />
      <Badges items={tags} />
    </div>
  </InfoWrap>
)

export default ArticleInfo

const InfoWrap = styled.div`
  display: flex;
  height: 7.5rem;
  flex-direction: column;
  justify-content: center;
  word-break: break-word;
`
