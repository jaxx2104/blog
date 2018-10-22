import React from 'react'
import styled from 'styled-components'

import Container from 'components/molecules/Container'
import Flex from 'components/molecules/Flex'
import NaviLogo from 'components/molecules/Logo'
import NaviMenu from 'components/molecules/Menu'

const Header = styled.header`
  padding: 0.5rem 0;
  z-index: 1;
  border-bottom: 1px solid #e9ecef;
  background-color: rgba(255, 255, 255, 0.8);
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
