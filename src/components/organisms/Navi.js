import React from 'react'
import styled from 'styled-components'

import Container from 'components/molecules/Container'
import Flex from 'components/molecules/Flex'
import NaviLogo from 'components/molecules/Logo'
import NaviMenu from 'components/molecules/Menu'

const Header = styled.header`
  padding: 0.5rem 0;
  z-index: 1;
  background-color: rgba(216, 27, 96, 0.9);
  position: sticky;
  top: 0;
`

const Navi = ({ title }) => (
  <Header>
    <Container>
      <Flex>
        <NaviLogo title={title} />
        <NaviMenu />
      </Flex>
    </Container>
  </Header>
)

export default Navi
