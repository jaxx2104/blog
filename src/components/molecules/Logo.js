import React from 'react'
import Link from 'gatsby-link'
import Heading from 'components/atoms/Heading'
import styled from 'styled-components'

const Wrap = styled.div`
  padding: 0 1rem;
`

const Logo = ({ title }) => (
  <Wrap>
    <Link to="/" style={{ textDecoration: 'none' }}>
      <Heading white>{title}</Heading>
    </Link>
  </Wrap>
)

export default Logo
