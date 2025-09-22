import React from "react"
import styled from "styled-components"
import Tumbnail from "./tumbnail"

interface Props {
  src?: string
  title: string
  animation: string
}

const SlideImage: React.FC<Props> = ({ src, title }: Props) => {
  return (
    <>
      <Tumbnail src={src} title={title} size={200} />
      <Capture>{title}</Capture>
    </>
  )
}
export default SlideImage

const Capture = styled.p`
  font-size: ${(props) => `${props.theme.fontSizeLargeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  font-family: "Courier New", Courier, monospace;
  text-align: center;
`
