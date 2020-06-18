import React from "react"
import styled from "styled-components"

interface Props {
  date: string
}

const Time: React.FC<Props> = ({ date }: Props) => {
  return <TimeWrap dateTime={date}>{date}</TimeWrap>
}

export default Time

const TimeWrap = styled.time`
  color: ${(props) => props.theme.colorSub};
  display: inline-block;
  font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  margin-right: 8px;
  text-align: center;
  vertical-align: baseline;
`
