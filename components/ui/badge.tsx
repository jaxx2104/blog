import type React from "react"
import styles from "./badge.module.css"

interface Props {
  items: string[] | null
  primary?: boolean
}

const Badges: React.FC<Props> = ({ items, primary }) => {
  if (!items) return null
  return (
    <>
      {items.map((item, i) => (
        <span
          key={i}
          className={styles.badge}
          data-primary={primary ? "" : undefined}
        >
          {item}
        </span>
      ))}
    </>
  )
}

export default Badges
