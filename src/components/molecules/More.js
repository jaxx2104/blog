import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Button = styled.button`
  border: 1px solid rebeccapurple;
  border-radius: 0.25rem;
  color: rebeccapurple;
  display: block;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.5;
  padding: 0.375rem 0.75rem;
  text-align: center;
  user-select: none;
  white-space: nowrap;
  width: 100%;
`

const More = ({ path }) => (
  <Link className="readmore" to={path} style={{ textDecoration: 'none' }}>
    <Button>MORE</Button>
  </Link>
)

export default More
