import type React from "react"
import styles from "./display.module.css"

interface Props {
  $size?: number
  $uppercase?: boolean
  children?: React.ReactNode
}

const Display: React.FC<Props> = ({ $size, $uppercase, children }) => (
  <h2
    className={styles.display}
    data-uppercase={$uppercase ? "" : undefined}
    style={
      $size !== undefined
        ? ({ "--display-size": `${$size}rem` } as React.CSSProperties)
        : undefined
    }
  >
    {children}
  </h2>
)

export default Display
