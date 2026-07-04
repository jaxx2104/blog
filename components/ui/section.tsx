import type React from "react"
import styles from "./section.module.css"

interface Props {
  center?: boolean
  children?: React.ReactNode
}

const Section: React.FC<Props> = ({ center, children }) => (
  <section className={styles.section} data-center={center ? "" : undefined}>
    {children}
  </section>
)

export default Section
