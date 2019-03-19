import React from 'react'
import styled, { css } from 'styled-components'

import Tumbnail from 'components/atoms/tumbnail'
import Animate from 'components/atoms/animate'

const SlideImage = ({ fluid, src, title, animation }) => {
  return (
    <Animate
      css={css`
        display: inline-block;
      `}
      animation={animation}
      data-emergence="hidden"
    >
      <Tumbnail fluid={fluid} src={src} title={title} size="200" />
      <Capture>{title}</Capture>
    </Animate>
  )
}
export default SlideImage

const Capture = styled.p`
  font-size: 0.6rem;
  font-weight: 900;
  font-family: 'Courier New', Courier, monospace;
  text-align: center;
`
