import React from "react"
import styled from "styled-components"

interface Props {
  created_at: string
}

const Time: React.FC<Props> = ({ created_at }: Props) => {
  return <TimeWrap dateTime={created_at}>{created_at}</TimeWrap>
}

export default Time

const TimeWrap = styled.time`
  color: ${(props) => props.theme.colorSub};
  display: inline-block;
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeight};
  text-align: center;
  vertical-align: baseline;
`
