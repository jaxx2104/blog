import React from "react"
import Link from "gatsby-link"
import styled from "styled-components"

import Hr from "./hr"
import Container from "./container"

interface Props {
  author: string
}

const Footer: React.FC<Props> = ({ author }: Props) => {
  return (
    <Container>
      <StyledFooter>
        <Hr />
        <p>コーラとバグが好き</p>
        <Link to="/profile/">
          <p>
            <strong>{author}</strong> on Profile
          </p>
        </Link>
      </StyledFooter>
    </Container>
  )
}

export default Footer

const StyledFooter = styled.div`
  padding: 2rem;
`
