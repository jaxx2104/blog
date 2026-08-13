import { createFileRoute } from "@tanstack/react-router"
import ArticleIndex from "@/components/features/article/article-index"
import { pageCount, pageSlice } from "@/components/features/article/pagination"
import Layout from "@/components/layout/layout"
import { getAllPosts } from "@/lib/posts"
import { SITE_TITLE, SITE_URL } from "@/lib/site"

export const Route = createFileRoute("/")({
  loader: () => {
    const all = getAllPosts()
    // Only this page's slice. TanStack Start serialises the loader result into
    // the prerendered HTML, so returning all 117 metas shipped the whole index
    // twice — once as markup, once as JSON.
    return {
      posts: pageSlice(all, 1),
      page: 1,
      pageCount: pageCount(all.length),
    }
  },
  component: HomePage,
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    // Page 1 of the index is "/", never /page/1/.
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
})

function HomePage() {
  const { posts, page, pageCount } = Route.useLoaderData()
  return (
    <Layout>
      <ArticleIndex posts={posts} page={page} pageCount={pageCount} />
    </Layout>
  )
}
