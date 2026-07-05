import type React from "react"
import ArticleInfo from "@/components/features/article/article-info"
import Share from "@/components/icons/icon-share"
import Link from "@/lib/router-link"
import styles from "./article.module.css"

export interface SiteMetaType {
  title: string
  description: string
  siteUrl: string
  author: string
  twitter: string
}

interface Props {
  path: string
  title: string
  created_at: string
  categories: string[] | null
  tags: string[] | null
  html: string
  site: SiteMetaType
}

const Article: React.FC<Props> = ({
  path,
  title,
  created_at,
  categories,
  tags,
  html,
  site,
}: Props) => {
  return (
    <div className={styles.cardwrap}>
      <article className={styles.card}>
        <Link href="/" className={styles.back}>
          ← WRITING
        </Link>
        <ArticleInfo
          path={path}
          title={title}
          created_at={created_at}
          categories={categories}
          tags={tags}
        />
        <div
          className="content"
          dangerouslySetInnerHTML={{
            __html: html,
          }}
        />
        <div className={styles.share}>
          <Share url={`${site.siteUrl}${path}`} title={title || ""} />
        </div>
      </article>
    </div>
  )
}

export default Article
