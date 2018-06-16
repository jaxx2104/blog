import React from 'react'
import styled from 'styled-components'

const Badge = styled.div`
  background-color: ${props => props.theme.main};
  border-radius: 0.25rem;
  color: white;
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0.2rem;
  padding: 0.2rem 0.4rem;
  text-align: center;
  vertical-align: baseline;
  white-space: nowrap;
`

const Badges = ({ items }) => (
  <div style={{ display: 'inline' }}>
    {items.map((item, i) => {
      return <Badge key={i}>{item}</Badge>
    })}
  </div>
)

export default Badges
