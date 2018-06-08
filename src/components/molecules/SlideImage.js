import React from 'react'
import styled from 'styled-components'

import Tumbnail from 'components/atoms/Tumbnail'
import Animate from 'components/molecules/Animate'

const Capture = styled.p`
  font-size: 1rem;
  font-weight: 900;
  font-family: 'Courier New', Courier, monospace;
`

const SlideImage = ({ src, title, animation }) => (
  <Animate animation={animation} data-emergence="hidden">
    <Tumbnail src={src} title={title} size="320" />
    <Capture>{title}</Capture>
  </Animate>
)
export default SlideImage
