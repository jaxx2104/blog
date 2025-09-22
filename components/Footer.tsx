"use client"

import React from "react"
import Link from "next/link"
import styled from "styled-components"

import Hr from "@/src/components/hr"
import Container from "@/src/components/container"

const Footer: React.FC = () => {
  return (
    <Container>
      <StyledFooter>
        <Hr />
        <p>コーラとバグが好き</p>
        <Link href="/profile">
          <p>
            <strong>jaxx2104</strong> on Profile
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
