import React from "react"
import Link from "gatsby-link"
import styled, { keyframes } from "styled-components"

const Logo = ({ title }) => (
  <Link to="/">
    <LogoWrap>{title}</LogoWrap>
  </Link>
)

export default Logo

const LogoWrap = styled.h1`
  @import url("https://fonts.googleapis.com/css?family=Permanent+Marker");

  color: white;
  font-family: "Permanent Marker";
  font-feature-settings: "liga" 1;
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 800;
  letter-spacing: -0.05rem;
  line-height: 0.5;
  padding: 0 1rem;
  text-rendering: optimizeLegibility;
  text-transform: ${(props) => (props.uppercase ? "uppercase" : "none")};

  :hover {
    color: ${(props) => props.theme.accent};
    transition: all 0.4s;
  }
`
