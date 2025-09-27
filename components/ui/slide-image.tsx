"use client"

import React from "react"
import Image from "next/image"
import styled from "styled-components"

interface Props {
  src: string
  alt: string
  title: string
  animation: "fadeIn" | "slideUp" | "slideDown"
}

const SlideImage: React.FC<Props> = ({ src, alt, title, animation }) => {
  return (
    <ImageWrapper $animation={animation}>
      <StyledImage
        src={src}
        alt={alt}
        width={200}
        height={200}
        style={{
          width: "200px",
          height: "auto",
        }}
      />
      <Capture>{title}</Capture>
    </ImageWrapper>
  )
}

export default SlideImage

const ImageWrapper = styled.div<{ $animation?: string }>`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.02);
  }

  animation: ${(props) => props.$animation} 0.6s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const StyledImage = styled(Image)`
  display: block;
  object-fit: cover;
`

const Capture = styled.p`
  font-size: ${(props) => `${props.theme.fontSizeLargeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  font-family: "Courier New", Courier, monospace;
  text-align: center;
`
