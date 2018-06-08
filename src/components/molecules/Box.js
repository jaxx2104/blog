import React from 'react'
import styled from 'styled-components'

import Icon from 'components/atoms/Icon'

const BoxWrap = styled.div`
  width: 25%;
  padding: 2rem 0;
  @media (max-width: 700px) {
    width: 50%;
  }
`

const Box = ({ label, icon }) => (
  <BoxWrap title={label}>
    <Icon name={icon} />
  </BoxWrap>
)
export default Box
