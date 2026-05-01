import type React from "react"
import styles from "./heading.module.css"

const Heading: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className={styles.heading}>{children}</h1>
)

export default Heading
