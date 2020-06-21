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
    <BadgeWrap>
      {items.map((item, i) => {
        return (
          <Badge key={i} primary={primary}>
            {item}
          </Badge>
        )
      })}
    </BadgeWrap>
  )
}

export default Badges

const BadgeWrap = styled.div`
  display: inline-block;
`

const Badge = styled.div<{ primary?: boolean }>`
  background-color: ${(props) =>
    props.primary ? props.theme.colorMain : props.theme.colorSub};
  border-radius: 4px;
  color: white;
  display: inline-block;
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  margin: 4px;
  padding: 4px 8px;
  text-align: center;
  vertical-align: baseline;
  white-space: nowrap;
`
