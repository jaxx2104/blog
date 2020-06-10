import React from "react"
import styled from "styled-components"
import map from "lodash/map"

const Badge = styled.div`
  background-color: ${(props) =>
    props.primary ? props.theme.main : props.theme.sub};
  border-radius: 0.25rem;
  color: white;
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  margin: 0.1rem;
  padding: 0.2rem 0.4rem;
  text-align: center;
  vertical-align: baseline;
  white-space: nowrap;
`

const Badges = ({ items, primary }) => (
  <div style={{ display: "inline" }}>
    {map(items, (item, i) => {
      return (
        <Badge key={i} primary={primary}>
          {item}
        </Badge>
      )
    })}
  </div>
)

export default Badges
