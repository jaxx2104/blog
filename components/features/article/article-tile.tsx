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
    <article className={styles.cell}>
      {thumbnail && (
        <div className={styles.media}>
          <img
            className={styles.thumbnail}
            src={thumbnail}
            alt=""
            loading="lazy"
          />
        </div>
      )}
      <div className={styles.body}>
        {created_at && (
          <p className={styles.eyebrow}>
            <Time created_at={created_at} />
          </p>
        )}
        <h2 className={styles.title}>{title}</h2>
        {excerpt && !thumbnail && <p className={styles.excerpt}>{excerpt}</p>}
      </div>
    </article>
  </Link>
)

export default ArticleTile
