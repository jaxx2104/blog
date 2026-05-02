import type React from "react"
import NaviLogo from "@/components/layout/navi-logo"
import NaviMenu from "@/components/layout/navi-menu"
import Container from "@/components/ui/container"
import Flex from "@/components/ui/flex"
import { useTheme } from "@/lib/ThemeContext"
import styles from "./navi.module.css"

const Navi: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className={styles.header}>
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
    </header>
  )
}

export default Navi
