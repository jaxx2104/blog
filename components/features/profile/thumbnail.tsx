"use client"

import React from "react"
import Image from "next/image"
import styled from "styled-components"

interface Props {
  circle?: boolean
  size: number
  src: string
  title: string
}

const Thumbnail: React.FC<Props> = ({ circle, size, src, title }: Props) => {
  return (
    <StyledThumbnail $circle={circle} $size={size}>
      <Image
        src={src}
        alt={title}
        title={title}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </StyledThumbnail>
  )
}

export default Thumbnail

const StyledThumbnail = styled.div<{ $circle?: boolean; $size: number }>`
  position: relative;
  width: ${(props) => props.$size || 120}px;
  height: ${(props) => props.$size || 120}px;
  border-radius: ${(props) => (props.$circle ? "50%" : "0")};
  overflow: hidden;
`
