import type React from "react"
import styles from "./section.module.css"

interface Props {
  primary?: boolean
  dark?: boolean
  center?: boolean
  children?: React.ReactNode
}

const Section: React.FC<Props> = ({ primary, dark, center, children }) => {
  const variant = primary ? "primary" : dark ? "dark" : undefined
  return (
    <section
      className={styles.section}
      data-variant={variant}
      data-center={center ? "" : undefined}
    >
      {children}
    </section>
  )
}

export default Section
