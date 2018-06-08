import React from 'react'
import styled from 'styled-components'

import Animate from 'components/molecules/Animate'

const I = styled.i`
  display: block;
  font-size: 5rem;
  text-align: center;
`

const Icon = ({ name }) => (
  <Animate animation="fadeIn" data-emergence="hidden">
    <I className={`devicon-${name}`} data-emergence="hidden" />
  </Animate>
)

export default Icon
