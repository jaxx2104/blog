import type React from "react"
import Container from "@/components/ui/container"
import Hr from "@/components/ui/hr"
import Link from "@/lib/router-link"
import styles from "./footer.module.css"

const Footer: React.FC = () => (
  <Container>
    <div className={styles.footer}>
      <Hr />
      <p>コーラとバグが好き</p>
      <Link href="/profile">
        <p>
          <strong>jaxx2104</strong> on Profile
        </p>
      </Link>
    </div>
  </Container>
)

export default Footer
