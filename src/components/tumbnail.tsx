import Img, { FluidObject } from "gatsby-image"
import React from "react"
import styled from "styled-components"

declare const __PATH_PREFIX__: string
const pathPrefix = process.env.NODE_ENV === "development" ? "" : __PATH_PREFIX__

interface Props {
  circle?: boolean
  fluid: FluidObject | FluidObject[] | undefined
  size: number
  src?: string
  title: string
}

const Tumbnail: React.FC<Props> = ({
  src,
  title,
  circle,
  size,
  fluid,
}: Props) => {
  return fluid ? (
    <StyledImage
      alt={title}
      circle={circle}
      size={size}
      fluid={fluid}
      title={title}
    />
  ) : (
    <StyledTumbnail
      alt={title}
      circle={circle}
      size={size}
      src={`${pathPrefix}${src}`}
      title={title}
    />
  )
}

export default Tumbnail

const StyledImage = styled(Img)<{ circle?: boolean; size: number }>`
  border-radius: ${(props) => (props.circle ? 50 : 0)}%;
  margin: auto;
  width: ${(props) => props.size || 120}px;
`

const StyledTumbnail = styled.img<{ circle?: boolean; size: number }>`
  border-radius: ${(props) => (props.circle ? 50 : 0)}%;
  width: ${(props) => props.size || 120}px;
`
