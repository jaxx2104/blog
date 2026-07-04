import type React from "react"
import Link from "@/lib/router-link"
import styles from "./footer.module.css"

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <p className={styles.epigraph}>コーラとバグが好き</p>
      <p className={styles.colophon}>
        © 2013–2026 jaxx2104 — <Link href="/profile">Profile</Link> /{" "}
        <a href="/feed.xml">RSS</a>
      </p>
    </div>
  </footer>
)

export default Footer
