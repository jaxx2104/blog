import type React from "react"
import Link from "@/lib/router-link"
import styles from "./article-tile.module.css"

interface Props {
  path: string
  title: string
  excerpt?: string
  thumbnail?: string
}

const ArticleTile: React.FC<Props> = ({ path, title, excerpt, thumbnail }) => (
  <Link href={path} className={styles.tileLink}>
    <article className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {thumbnail ? (
          // biome-ignore lint/performance/noImgElement: prerender static export uses native img by design
          <img
            className={styles.thumbnail}
            src={thumbnail}
            alt={title}
            loading="lazy"
          />
        ) : (
          <p className={styles.excerpt}>{excerpt}</p>
        )}
      </div>
    </article>
  </Link>
)

export default ArticleTile
