import { createFileRoute, notFound } from "@tanstack/react-router"
import ArticleIndex from "@/components/features/article/article-index"
import {
  pageCount,
  pagePath,
  pageSlice,
  parsePageParam,
} from "@/components/features/article/pagination"
import Layout from "@/components/layout/layout"
import { getAllPosts } from "@/lib/posts"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"

/**
 * Pages 2..N of the index. This is a static two-segment route, so it outranks
 * the root splat in `$.tsx` — "/page/2/" reaches here, not the post lookup.
 */
export const Route = createFileRoute("/page/$page")({
  loader: ({ params }) => {
    const all = getAllPosts()
    // Rejects 0, negatives, out-of-range, non-numeric and "1" (that is "/").
    const page = parsePageParam(params.page, all.length)
    if (page === null) throw notFound()
    return {
      posts: pageSlice(all, page),
      page,
      pageCount: pageCount(all.length),
    }
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
  return (
    <Layout>
      <main>
        <h1>404 — Not Found</h1>
        <p>This page number is outside the index.</p>
      </main>
    </Layout>
  )
}
