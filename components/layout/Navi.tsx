"use client"

import React from "react"
import styled from "styled-components"
import Container from "@/components/ui/Container"
import Flex from "@/components/ui/Flex"
import NaviLogo from "@/components/layout/NaviLogo"
import NaviMenu from "@/components/layout/NaviMenu"

const Navi: React.FC = () => {
  return (
    <Header>
      <Container>
        <Flex>
          <NaviLogo title="jaxx2104.info" />
          <NaviMenu
            items={[
              { text: "Home", to: "/" },
              { text: "Profile", to: "/profile" },
            ]}
          />
        </Flex>
      </Container>
    </Header>
  )
}

export default Navi

const Header = styled.header`
  background-color: ${(props) => props.theme.colorMain};
  position: sticky;
  margin-bottom: 1rem;
  top: 0;
  z-index: 1;

  a {
    text-decoration: none;
  }
`
