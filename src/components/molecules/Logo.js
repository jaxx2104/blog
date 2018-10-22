import React from 'react'
import Link from 'gatsby-link'
import styled, { keyframes } from 'styled-components'

const Wrap = styled.h1`
  @import url('https://fonts.googleapis.com/css?family=Permanent+Marker');
  color: white;
  font-family: 'Permanent Marker', cursive;
  font-style: italic;
  font-size: 2rem;
  line-height: 0.5;
  padding: 0 1rem;
  text-transform: ${props => (props.uppercase ? 'uppercase' : 'none')};
  letter-spacing: -0.025rem;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'liga' 1;

  :hover {
    color: ${props => props.theme.sub};
    transition: all 0.4s;
  }
`

const Logo = ({ title }) => (
  <Link to="/" style={{ textDecoration: 'none' }}>
    <Wrap>{title}</Wrap>
  </Link>
)

export default Logo
