import type React from "react"
import Link from "@/lib/router-link"
import styles from "./navi-logo.module.css"

interface Props {
  title: string
}

const Logo: React.FC<Props> = ({ title }) => (
  <Link href="/">
    <h1 className={styles.logo}>{title}</h1>
  </Link>
)

export default Logo
