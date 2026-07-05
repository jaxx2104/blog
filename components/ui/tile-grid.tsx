import type React from "react"
import styles from "./tile-grid.module.css"

const TileGrid: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <section className={styles.wrap}>
    <div className={styles.eyebrow}>
      <span>LATEST WRITING</span>
      <span>INDEX</span>
    </div>
    <div className={styles.list}>{children}</div>
  </section>
)

export default TileGrid
