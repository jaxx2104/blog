import type React from "react"
import Engraving from "@/components/ui/engraving"
import Time from "@/components/ui/time"
import Link from "@/lib/router-link"
import styles from "./article-hero.module.css"

interface Props {
  path: string
  title: string
  created_at?: string
  excerpt?: string
}

const ArticleHero: React.FC<Props> = ({ path, title, created_at, excerpt }) => (
  <section className={styles.hero}>
    <div className={styles.copy}>
      <p className={styles.eyebrow}>
        Latest entry
        {created_at && (
          <>
            {" — "}
            <Time created_at={created_at} />
          </>
        )}
      </p>
      <h1 className={styles.title}>
        <Link className={styles.titleLink} href={path}>
          {title}
        </Link>
      </h1>
      {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
      <Link className={styles.cta} href={path}>
        Read the entry →
      </Link>
    </div>
    <div className={styles.art} aria-hidden="true">
      <Engraving />
    </div>
  </section>
)

export default ArticleHero
