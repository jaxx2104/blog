import React from "react"
import styled from "styled-components"

import Container from "../../components/container"
import Flex from "../../components/flex"
import NaviLogo from "./navi-logo"
import NaviMenu from "./navi-menu"

interface Props {
  title: string
  theme: "light" | "dark"
  onDarkMode: (
    event: React.MouseEvent<HTMLParagraphElement, MouseEvent>
  ) => void
}

const Navi: React.FC<Props> = ({ title, theme, onDarkMode }: Props) => {
  return (
    <Header>
      <Container>
        <Flex>
          <NaviLogo title={title} />
          <NaviMenu
            items={[
              { text: "Home", to: "/" },
              { text: "Profile", to: "/profile" },
              { text: theme === "light" ? "🌅" : "🌃", action: onDarkMode },
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
