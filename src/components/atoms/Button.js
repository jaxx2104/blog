import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Btn = styled.button`
  background-color: transparent;
  background-image: none;
  border-radius: 0.25rem;
  border: 0.5px solid
    ${props => (props.primary ? props.theme.main : props.theme.sub)};
  color: ${props => (props.primary ? props.theme.main : props.theme.sub)};
  display: block;
  font-size: 1rem;
  font-weight: 300;
  line-height: 1.5;
  margin: 1rem;
  padding: 0.375rem 0.75rem;
  text-align: center;
  user-select: none;
  white-space: nowrap;
  width: 100%;
  :hover {
    background-color: ${props =>
      props.primary ? props.theme.main : props.theme.sub};
    color: white;
  }
`

const Button = ({ label, path, primary }) => (
  <Link className="readmore" to={path} style={{ textDecoration: 'none' }}>
    <Btn primary>{label}</Btn>
  </Link>
)

export default Button
