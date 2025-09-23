import { getAllPosts } from "@/lib/posts"
import Layout from "@/components/layout/Layout"
import ArticleTile from "@/components/features/article/ArticleTile"
import TileGrid from "@/components/ui/TileGrid"

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
