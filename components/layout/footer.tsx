import type React from "react"
import Container from "@/components/ui/container"
import Link from "@/lib/router-link"
import styles from "./footer.module.css"

const Footer: React.FC = () => (
  <Container>
    <div className={styles.footer}>
      <Link href="/">
        <span className={styles.word}>jaxx2104.info</span>
      </Link>
      <span className={styles.meta}>
        PROGRAMS &amp; BUGS · TOKYO · SINCE 2013
      </span>
    </div>
  </Container>
)

export default Footer
