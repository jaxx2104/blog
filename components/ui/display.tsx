import type React from "react"
import styles from "./display.module.css"

const Display: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h2 className={styles.display}>{children}</h2>
)

export default Display
