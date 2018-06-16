import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Btn = styled.button`
  border-radius: 0.25rem;
  border: 1px solid ${props => props.theme.main};
  color: ${props => props.theme.main};
  display: block;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 1rem;
  padding: 0.375rem 0.75rem;
  text-align: center;
  user-select: none;
  white-space: nowrap;
  width: 100%;
`

const Button = ({ label, path }) => (
  <Link className="readmore" to={path} style={{ textDecoration: 'none' }}>
    <Btn>{label}</Btn>
  </Link>
)

export default Button
