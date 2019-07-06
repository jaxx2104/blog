import React from "react"
import Link from "gatsby-link"
import styled from "styled-components"

import Hr from "components/atoms/hr"
import Container from "components/atoms/container"

const Footer = ({ author }) => (
  <Container>
    <Wrap>
      <Hr />
      <p>コーラとバグが好き</p>
      <Link to="/profile/">
        <p>
          <strong>{author}</strong> on Profile
        </p>
      </Link>
    </Wrap>
  </Container>
)

export default Footer

const Wrap = styled.div`
  padding: 2rem;
`
