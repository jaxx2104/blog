import { createFileRoute } from "@tanstack/react-router"
import ArticleTile from "@/components/features/article/article-tile"
import Layout from "@/components/layout/layout"
import TileGrid from "@/components/ui/tile-grid"
import { getAllPosts } from "@/lib/posts"
import { SITE_TITLE, SITE_URL } from "@/lib/site"

export const Route = createFileRoute("/")({
  loader: () => ({ posts: getAllPosts() }),
  component: HomePage,
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
})

function HomePage() {
  const { posts } = Route.useLoaderData()
  return (
    <Layout>
      <TileGrid>
        {posts.map((post) => (
          <ArticleTile
            key={post.permalink}
            path={post.permalink}
            title={post.title}
            excerpt={post.excerpt}
            thumbnail={post.thumbnail}
          />
        ))}
      </TileGrid>
    </Layout>
  )
}
