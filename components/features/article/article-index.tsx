import type React from "react"
import ArticleTile from "@/components/features/article/article-tile"
import Pager from "@/components/ui/pager"
import TileGrid from "@/components/ui/tile-grid"
import { pagePath } from "@/lib/pagination"
import type { PostMeta } from "@/lib/posts"
import styles from "./article-index.module.css"

interface Props {
  /** One page's worth of posts, already sliced by the route loader. */
  posts: PostMeta[]
  page: number
  pageCount: number
}

const ArticleIndex: React.FC<Props> = ({ posts, page, pageCount }) => (
  <>
    <TileGrid>
      {posts.map((post) => (
        <ArticleTile
          key={post.permalink}
          path={post.permalink}
          title={post.title}
          created_at={post.created_at}
          excerpt={post.excerpt}
          category={post.category}
        />
      ))}
    </TileGrid>
    <div className={styles.pager}>
      <Pager page={page} pageCount={pageCount} hrefFor={pagePath} />
    </div>
  </>
)

export default ArticleIndex
