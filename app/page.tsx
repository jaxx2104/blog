import { getAllPosts } from "@/lib/posts"
import Layout from "@/components/layout/layout"
import ArticleTile from "@/components/features/article/article-tile"
import TileGrid from "@/components/ui/tile-grid"

export default async function HomePage() {
  const posts = await getAllPosts()

  return (
    <Layout>
      <TileGrid>
        {posts.map((post) => (
          <ArticleTile
            key={post.slug}
            path={post.path}
            title={post.title}
            excerpt={post.excerpt}
            thumbnail={post.thumbnail}
          />
        ))}
      </TileGrid>
    </Layout>
  )
}
