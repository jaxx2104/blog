import { getAllPosts } from "@/lib/posts"
import Layout from "@/components/layout/Layout"
import Article from "@/components/features/article/ArticleIndex"

export default async function HomePage() {
  const posts = await getAllPosts()

  return (
    <Layout>
      {posts.map((post) => (
        <Article
          key={post.slug}
          path={post.path}
          title={post.title}
          created_at={post.created_at}
          categories={post.category ? [post.category] : null}
          tags={post.tags || null}
        />
      ))}
    </Layout>
  )
}
