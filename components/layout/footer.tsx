import type React from "react"
import styled from "styled-components"
import Container from "@/components/ui/container"
import Hr from "@/components/ui/hr"
import Link from "@/lib/router-link"

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
  padding: 2rem 0;
`
