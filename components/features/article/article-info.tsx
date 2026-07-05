import type React from "react"
import Badges from "@/components/ui/badge"
import Heading from "@/components/ui/heading"
import Time from "@/components/ui/time"
import Link from "@/lib/router-link"
import styles from "./article-info.module.css"

interface Props {
  path: string
  title: string
  created_at: string
  categories: string[] | null
  tags: string[] | null
}

const ArticleInfo: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
}) => (
  <div className={styles.wrap}>
    <div className={styles.kicker}>
      <Time created_at={created_at} />
      {categories?.map((c) => (
        <span key={c} className={styles.cat}>
          {c}
        </span>
      ))}
    </div>
    <Link className={styles.headingLink} href={path}>
      <Heading>{title}</Heading>
    </Link>
    {tags && tags.length > 0 && (
      <div className={styles.tags}>
        <Badges items={tags} />
      </div>
    )}
  </div>
)

export default ArticleInfo
