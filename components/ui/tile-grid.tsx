import type React from "react"
import styles from "./tile-grid.module.css"

const TileGrid: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className={styles.grid}>{children}</div>
)

export default TileGrid
