import React from "react"
import Link from "gatsby-link"
import styled from "styled-components"

const Menu = ({ items }) => (
  <MenuWrap>
    {(items || []).map((item, index) => {
      const { action, text, to } = item
      let menuItem = <MenuItem onClick={action || null}>{text}</MenuItem>
      if (to) {
        menuItem = <Link to={to}>{menuItem}</Link>
      }
      return <span key={index}>{menuItem}</span>
    })}
  </MenuWrap>
)
export default Menu

const MenuWrap = styled.div`
  display: flex;
  flex-direction: row;
`

const MenuItem = styled.p`
  color: white;
  cursor: pointer;
  padding: 0 0.5rem;

  :hover {
    color: ${props => props.theme.accent};
    transition: all 0.4s;
  }
`
