import React from 'react'
import styled from 'styled-components'

import NaviLogo from 'components/atoms/Logo'
import NaviMenu from 'components/molecules/Menu'

const Header = styled.header`
  background-color: rebeccapurple;
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 1;
`

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin: 0 auto;
  max-width: 960px;
`

const Navi = ({ location, title }) => (
  <Header>
    <Container>
      <NaviLogo title={title} />
      <NaviMenu />
    </Container>
  </Header>
)

export default Navi
