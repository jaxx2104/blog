import { createFileRoute } from "@tanstack/react-router"
import ArticleHero from "@/components/features/article/article-hero"
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
  const [latest, ...rest] = posts
  return (
    <Layout>
      {latest && (
        <ArticleHero
          path={latest.permalink}
          title={latest.title}
          created_at={latest.created_at}
          excerpt={latest.excerpt}
        />
      )}
      <TileGrid label={`Archive — ${rest.length} entries`}>
        {rest.map((post) => (
          <ArticleTile
            key={post.permalink}
            path={post.permalink}
            title={post.title}
            created_at={post.created_at}
            excerpt={post.excerpt}
            thumbnail={post.thumbnail}
          />
        ))}
      </TileGrid>
    </Layout>
  )
}
