import React from "react"
import styled from "styled-components"

interface Props {
  circle?: boolean
  size: number
  src?: string
  title: string
}

const Tumbnail: React.FC<Props> = ({ src, title, circle, size }: Props) => {
  return (
    <StyledTumbnail
      alt={title}
      $circle={circle}
      $size={size}
      src={src || ""}
      title={title}
    />
  )
}

export default Tumbnail

const StyledTumbnail = styled.img<{ $circle?: boolean; $size: number }>`
  border-radius: ${(props) => (props.$circle ? 50 : 0)}%;
  width: ${(props) => props.$size || 120}px;
`
