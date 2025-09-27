"use client"

import React from "react"
import styled from "styled-components"
import Container from "@/components/ui/container"
import Flex from "@/components/ui/flex"
import NaviLogo from "@/components/layout/navi-logo"
import NaviMenu from "@/components/layout/navi-menu"
import { useTheme } from "@/lib/ThemeContext"

const Navi: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <Header>
      <Container>
        <Flex>
          <NaviLogo title="jaxx2104.info" />
          <NaviMenu
            items={[
              { text: "Home", to: "/" },
              { text: "Profile", to: "/profile" },
              { text: theme === "light" ? "🌅" : "🌃", action: toggleTheme },
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
