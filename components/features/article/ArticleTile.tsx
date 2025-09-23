"use client"

import React from "react"
import Link from "next/link"
import styled from "styled-components"

interface Props {
  path: string
  title: string
  excerpt?: string
  thumbnail?: string
}

const TileContainer = styled.article`
  background: ${(props) => props.theme.colorBackground};
  border: 1px solid ${(props) => props.theme.colorBorder};
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  height: 120px;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 4px 12px ${(props) => props.theme.colorShadow};
    transform: translateY(-2px);
  }
`

const ThumbnailImage = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
`

const ContentContainer = styled.div`
  padding: 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const Title = styled.h2`
  color: ${(props) => props.theme.colorMain};
  font-size: ${(props) => `${props.theme.fontSize}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  line-height: 1.25;
  letter-spacing: -0.025rem;
  margin: 0 0 4px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`

const Excerpt = styled.p`
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeight};
  color: ${(props) => props.theme.colorText};
  line-height: 1.25;
  margin: 0 0 8px 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
`

const ArticleTile: React.FC<Props> = ({ path, title, excerpt, thumbnail }) => {
  return (
    <Link href={path} style={{ textDecoration: "none" }}>
      <TileContainer>
        <ContentContainer>
          <Title>{title}</Title>
          {thumbnail ? (
            <ThumbnailImage src={thumbnail} alt={title} loading="lazy" />
          ) : (
            <Excerpt>{excerpt}</Excerpt>
          )}
        </ContentContainer>
      </TileContainer>
    </Link>
  )
}

export default ArticleTile
