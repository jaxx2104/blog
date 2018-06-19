import React from 'react'
import styled, { keyframes } from 'styled-components'

import Icon from 'components/atoms/Icon'

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

const BoxWrap = styled.div`
  width: 25%;
  padding: 2rem 0;
  @media (max-width: 700px) {
    width: 50%;
  }
  :hover {
    animation: ${move} 0.3s linear;
  }
`

const Box = ({ label, icon }) => (
  <BoxWrap title={label}>
    <Icon name={icon} />
  </BoxWrap>
)
export default Box
