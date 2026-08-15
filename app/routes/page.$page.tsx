import { createFileRoute, notFound } from "@tanstack/react-router"
import ArticleIndex from "@/components/features/article/article-index"
import NotFound from "@/components/features/not-found"
import Layout from "@/components/layout/layout"
import { pagePath, parsePageParam } from "@/lib/pagination"
import { getIndexPage } from "@/lib/posts"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"

/**
 * Pages 2..N of the index. This is a static two-segment route, so it outranks
 * the root splat in `$.tsx` — "/page/2/" reaches here, not the post lookup.
 */
export const Route = createFileRoute("/page/$page")({
  loader: async ({ params }) => {
    // Rejects 0, negatives, non-numeric, zero-padded and "1" (that is "/").
    const page = parsePageParam(params.page)
    if (page === null) throw notFound()
    // Past the last page there is no file, which is the range check.
    const index = await getIndexPage(page)
    if (!index) throw notFound()
    return index
  },
  component: IndexPage,
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { page } = loaderData
    // Distinct from the home title — duplicate titles across a paginated
    // series read as duplicate pages.
    const title = `${SITE_TITLE} | ${page}ページ目`
    const description = `${SITE_DESCRIPTION} — 記事一覧 ${page}ページ目`
    const url = `${SITE_URL}${pagePath(page)}`
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    }
  },
  notFoundComponent: NotFoundComponent,
})

function IndexPage() {
  const { posts, page, pageCount } = Route.useLoaderData()
  return (
    <Layout>
      <ArticleIndex posts={posts} page={page} pageCount={pageCount} />
    </Layout>
  )
}

function NotFoundComponent() {
  return <NotFound detail="This page number is outside the index." />
}
