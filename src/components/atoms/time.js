import React from 'react'
import styled from 'styled-components'

const Time = ({ date }) => <TimeWrap dateTime={date}>{date}</TimeWrap>

export default Time

const TimeWrap = styled.time`
  color: #adb5bd;
  display: inline;
  font-size: 0.75rem;
  font-weight: 300;
  line-height: 1.2;
  margin-right: 1rem;
  text-align: center;
  vertical-align: baseline;
`
