import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Menu = () => (
  <MenuWrap>
    {[{ text: 'Home', to: '/' }, { text: 'Profile', to: '/profile' }].map(
      (item, index) => (
        <Link key={index} to={item.to}>
          <MenuItem>{item.text}</MenuItem>
        </Link>
      )
    )}
  </MenuWrap>
)
export default Menu

const MenuWrap = styled.div`
  display: flex;
  flex-direction: row;
`

const MenuItem = styled.p`
  color: white;
  padding: 0 0.5rem;

  :hover {
    color: ${props => props.theme.accent};
    transition: all 0.4s;
  }
`
