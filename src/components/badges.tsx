import React from "react"
import styled from "styled-components"

interface Props {
  items: string[] | null
  primary?: boolean
}

const Badges: React.FC<Props> = ({ items, primary }: Props) => {
  if (!items) {
    return null
  }

  return (
    <>
      {items.map((item, i) => {
        return (
          <Badge key={i} primary={primary}>
            {item}
          </Badge>
        )
      })}
    </>
  )
}

export default Badges

const Badge = styled.span<{ primary?: boolean }>`
  background-color: ${(props) =>
    props.primary ? props.theme.colorMain : props.theme.colorSub};
  border-radius: 4px;
  box-sizing: border-box;
  color: rgb(255, 255, 255);
  display: inline;
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  line-height: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeight};
  outline-style: none;
  margin: auto 0;
  text-decoration-line: none;
  padding: ${(props) =>
    `${props.theme.fontSizeSmall / 2}rem ${props.theme.fontSizeSmall}rem`};
  text-align: center;
  white-space: nowrap;
`
