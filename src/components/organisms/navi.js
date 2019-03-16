import React from 'react'
import styled from 'styled-components'

import Container from 'components/molecules/container'
import Flex from 'components/molecules/flex'
import NaviLogo from 'components/molecules/logo'
import NaviMenu from 'components/molecules/menu'

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
