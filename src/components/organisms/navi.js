import React from 'react'
import styled from 'styled-components'

import Container from 'components/atoms/container'
import Flex from 'components/atoms/flex'
import NaviLogo from 'components/molecules/navi-logo'
import NaviMenu from 'components/molecules/navi-menu'

const Navi = ({ title, isDarkMode, onDarkMode }) => (
  <Header>
    <Container>
      <Flex>
        <NaviLogo title={title} />
        <NaviMenu
          items={[
            { text: 'Home', to: '/' },
            { text: 'Profile', to: '/profile' },
          ]}
        />
        <NaviMenu
          items={[{ text: isDarkMode ? '🌃' : '🌅', action: onDarkMode }]}
        />
      </Flex>
    </Container>
  </Header>
)

export default Navi

const Header = styled.header`
  background-color: ${props => props.theme.main};
  opacity: 0.8;
  padding: 0.5rem 0;
  position: sticky;
  top: 0;
  transition: 0.2s;
  z-index: 1;

  a {
    text-decoration: none;
  }

  :hover {
    opacity: 1;
  }
`
