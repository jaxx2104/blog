import type React from "react"
import styles from "./container.module.css"

interface Props {
  children?: React.ReactNode
  narrow?: boolean
}

const Container: React.FC<Props> = ({ children, narrow }) => (
  <div className={styles.container} data-narrow={narrow ? "" : undefined}>
    {children}
  </div>
)

export default Container
