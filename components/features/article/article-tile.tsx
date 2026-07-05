import type React from "react"
import Time from "@/components/ui/time"
import Link from "@/lib/router-link"
import styles from "./article-tile.module.css"

interface Props {
  path: string
  title: string
  created_at?: string
  excerpt?: string
  category?: string
}

const ArticleTile: React.FC<Props> = ({
  path,
  title,
  created_at,
  excerpt,
  category,
}) => (
  <Link href={path} className={styles.row}>
    <div className={styles.main}>
      <span className={styles.title}>{title}</span>
      {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
    </div>
    <div className={styles.meta}>
      {category && <span className={styles.cat}>{category}</span>}
      {created_at && <Time created_at={created_at} />}
    </div>
  </Link>
)

export default ArticleTile
