import React from "react"
import Link from "gatsby-link"
import styled from "styled-components"

type Item = {
  to?: string
  text: string
  action?: (event: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => void
}

interface Props {
  items: Item[]
}

const Menu: React.FC<Props> = ({ items }: Props) => (
  <MenuWrap>
    {(items || []).map((item, index) => {
      const { action, text, to } = item
      const menuItem = <MenuItem onClick={action}>{text}</MenuItem>
      return (
        <span key={index}>
          {to ? <Link to={to}>{menuItem}</Link> : menuItem}
        </span>
      )
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
  margin: 0 8px;

  :hover {
    color: ${(props) => props.theme.colorAccent};
    transition: color 0.2s ease-out;
  }
`
