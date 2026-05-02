import type React from "react"
import styles from "./flex.module.css"

interface Props {
  $center?: boolean
  children?: React.ReactNode
}

const Flex: React.FC<Props> = ({ $center, children }) => (
  <div className={styles.flex} data-center={$center ? "" : undefined}>
    {children}
  </div>
)

export default Flex
