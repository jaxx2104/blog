import { createFileRoute } from "@tanstack/react-router"
import ArticleIndex from "@/components/features/article/article-index"
import Layout from "@/components/layout/layout"
import { getIndexPage } from "@/lib/posts"
import { SITE_TITLE, SITE_URL } from "@/lib/site"

const EMPTY_INDEX = { page: 1, pageCount: 1, posts: [] }

export const Route = createFileRoute("/")({
  // Only this page's slice, loaded from its own chunk. TanStack Start
  // serialises the loader result into the prerendered HTML, so returning all
  // 117 metas shipped the whole index twice — once as markup, once as JSON —
  // and reading them from a statically imported module put them in the entry
  // chunk on top of that.
  loader: async () => (await getIndexPage(1)) ?? EMPTY_INDEX,
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
