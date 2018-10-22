import React from 'react'
import Link from 'gatsby-link'
import styled, { keyframes } from 'styled-components'

const Wrap = styled.h1`
  @import url('https://fonts.googleapis.com/css?family=Permanent+Marker');
  color: ${props => props.theme.sub};
  font-family: 'Permanent Marker', cursive;
  font-style: italic;
  font-size: 1.8rem;
  line-height: 1;
  padding: 0 1rem;
  text-transform: ${props => (props.uppercase ? 'uppercase' : 'none')};

  :hover {
    color: ${props => props.theme.main};
    transition: all 0.4s;
  }
`

const Logo = ({ title }) => (
  <Link to="/" style={{ textDecoration: 'none' }}>
    <Wrap>{title}</Wrap>
  </Link>
)

export default Logo
