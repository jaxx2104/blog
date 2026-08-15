import type React from "react"
import NaviLogo from "@/components/layout/navi-logo"
import NaviMenu from "@/components/layout/navi-menu"
import Container from "@/components/ui/container"
import { useTheme } from "@/lib/ThemeContext"
import styles from "./navi.module.css"

const Navi: React.FC = () => {
  const { toggleTheme } = useTheme()
  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.inner}>
          <NaviLogo title="jaxx2104" />
          <NaviMenu
            items={[
              { text: "Home", to: "/" },
              { text: "Profile", to: "/profile" },
              // The glyph lives in navi-menu.module.css, keyed on data-theme.
              { label: "テーマを切り替える", action: toggleTheme },
            ]}
          />
        </div>
      </Container>
    </header>
  )
}

export default Navi
