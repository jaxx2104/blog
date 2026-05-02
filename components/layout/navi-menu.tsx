import type React from "react"
import Link from "@/lib/router-link"
import styles from "./navi-menu.module.css"

type Item = {
  to?: string
  text: string
  action?: (event: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => void
}

interface Props {
  items: Item[]
}

const Menu: React.FC<Props> = ({ items }) => (
  <div className={styles.menu}>
    {(items || []).map((item, index) => {
      const { action, text, to } = item
      const menuItem = (
        // biome-ignore lint/a11y/useKeyWithClickEvents: legacy interactive-p pattern from styled-components migration
        <p className={styles.item} onClick={action}>
          {text}
        </p>
      )
      return (
        <span key={index}>
          {to ? <Link href={to}>{menuItem}</Link> : menuItem}
        </span>
      )
    })}
  </div>
)

export default Menu
