import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Btn = styled.button`
  background-color: transparent;
  background-image: none;
  border-radius: 0.25rem;
  border: 2px solid
    ${props => (props.primary ? props.theme.main : props.theme.sub)};
  color: ${props => (props.primary ? props.theme.main : props.theme.sub)};
  display: block;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  text-align: center;
  transition: 0.2s;
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
    <Btn primary={primary}>{label}</Btn>
  </Link>
)

export default Button
