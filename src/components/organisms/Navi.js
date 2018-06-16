import React from 'react'
import styled, { keyframes } from 'styled-components'

import Container from 'components/molecules/Container'
import Flex from 'components/molecules/Flex'
import NaviLogo from 'components/molecules/Logo'
import NaviMenu from 'components/molecules/Menu'

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

const Header = styled.header`
  background-color: ${props => props.theme.main};
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 1;
  :hover {
    animation: ${move} 0.3s linear;
  }
`

const Navi = ({ location, title }) => (
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
