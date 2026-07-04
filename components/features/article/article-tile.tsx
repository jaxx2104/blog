import type React from "react"
import Time from "@/components/ui/time"
import Link from "@/lib/router-link"
import styles from "./article-tile.module.css"

interface Props {
  path: string
  title: string
  created_at?: string
  excerpt?: string
  thumbnail?: string
}

const ArticleTile: React.FC<Props> = ({
  path,
  title,
  created_at,
  excerpt,
  thumbnail,
}) => (
  <Link href={path} className={styles.tileLink}>
    <article className={styles.container}>
      {thumbnail && (
        <img
          className={styles.thumbnail}
          src={thumbnail}
          alt=""
          loading="lazy"
        />
      )}
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {!thumbnail && excerpt && <p className={styles.excerpt}>{excerpt}</p>}
        {created_at && (
          <div className={styles.date}>
            <Time created_at={created_at} />
          </div>
        )}
      </div>
    </article>
  </Link>
)

export default ArticleTile
