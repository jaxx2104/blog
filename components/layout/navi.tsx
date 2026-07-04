import type React from "react"
import Link from "@/lib/router-link"
import { useTheme } from "@/lib/ThemeContext"
import styles from "./navi.module.css"

const Navi: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className={styles.masthead}>
      <nav className={styles.navLeft}>
        <Link className={styles.navLink} href="/">
          Index
        </Link>
      </nav>
      <Link className={styles.logoLink} href="/">
        <p className={styles.logo} data-text="jaxx2104.info">
          jaxx2104<span className={styles.logoTld}>.info</span>
        </p>
      </Link>
      <nav className={styles.navRight}>
        <Link className={styles.navLink} href="/profile">
          Profile
        </Link>
        <button type="button" className={styles.invert} onClick={toggleTheme}>
          {theme === "light" ? "Paper" : "Poster"}
        </button>
      </nav>
    </header>
  )
}

export default Navi
