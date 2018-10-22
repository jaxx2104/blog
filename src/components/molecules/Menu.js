import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const MenuWrap = styled.div`
  display: flex;
  flex-direction: row;
`

const MenuItem = styled.p`
  color: ${props => props.theme.sub};
  padding: 0 0.5rem;

  :hover {
    color: ${props => props.theme.main};
    animation: 1s;
  }
`

const Menu = () => {
  return (
    <MenuWrap>
      {[{ text: 'Home', to: '/' }, { text: 'Profile', to: '/profile' }].map(
        (item, index) => {
          return (
            <Link key={index} to={item.to} style={{ textDecoration: 'none' }}>
              <MenuItem>{item.text}</MenuItem>
            </Link>
          )
        }
      )}
    </MenuWrap>
  )
}

export default Menu
