import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

const Heading = styled.h1`
  font-weight: 800;
  font-size: 1.5rem;
  color: white;
  text-decoration: none;
  padding: 0 2rem;
`

const Logo = ({ title }) => (
  <div style={{}}>
    <Link to="/" style={{ textDecoration: 'none' }}>
      <Heading>{title}</Heading>
    </Link>
  </div>
)

export default Logo
