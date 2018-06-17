import React from 'react'
import styled, { keyframes } from 'styled-components'

import Animate from 'components/molecules/Animate'

const move = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0);
  }
}
`

const I = styled.i`
  display: block;
  font-size: 5rem;
  text-align: center;
  :hover {
    animation: ${move} 0.3s linear;
  }
`

const Icon = ({ name }) => (
  <Animate animation="fadeIn" data-emergence="visible">
    <I className={`devicon-${name}`} />
  </Animate>
)

export default Icon
