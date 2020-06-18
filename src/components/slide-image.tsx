import React from "react"
import styled from "styled-components"
import { FluidObject } from "gatsby-image"
import Tumbnail from "./tumbnail"

interface Props {
  fluid: FluidObject | FluidObject[] | undefined
  src?: string
  title: string
  animation: string
}

const SlideImage: React.FC<Props> = ({ fluid, src, title }: Props) => {
  return (
    <>
      <Tumbnail fluid={fluid} src={src} title={title} size={200} />
      <Capture>{title}</Capture>
    </>
  )
}
export default SlideImage

const Capture = styled.p`
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  font-family: "Courier New", Courier, monospace;
  text-align: center;
`
