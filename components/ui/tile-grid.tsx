import type React from "react"
import styles from "./tile-grid.module.css"

interface Props {
  children?: React.ReactNode
  label?: string
}

const TileGrid: React.FC<Props> = ({ children, label }) => (
  <div className={styles.wrap}>
    {label && <p className={styles.label}>{label}</p>}
    <div className={styles.grid}>{children}</div>
  </div>
)

export default TileGrid
