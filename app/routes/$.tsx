import { createFileRoute, notFound } from "@tanstack/react-router"
import Article, {
  type SiteMetaType,
} from "@/components/features/article/article"
import Layout from "@/components/layout/layout"
import { getPostByPermalink } from "@/lib/posts"
import {
  DEFAULT_OGP_IMAGE,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_TWITTER,
  SITE_URL,
} from "@/lib/site"

const SITE_META: SiteMetaType = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  siteUrl: SITE_URL,
  author: SITE_AUTHOR,
  twitter: SITE_TWITTER,
}

export const Route = createFileRoute("/$")({
  loader: ({ params }) => {
    // params._splat is the URL portion after the root (e.g. "php-replace-lf"
    // for "/php-replace-lf/"). Velite stores permalinks with leading and
    // trailing slashes, so we normalise both shapes before lookup.
    const raw = params._splat ?? ""
    const trimmed = raw.replace(/^\/+|\/+$/g, "")
    const post =
      getPostByPermalink(`/${trimmed}/`) ?? getPostByPermalink(`/${trimmed}`)
    if (!post) throw notFound()
    return { post }
  },
  component: PostPage,
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { post } = loaderData
    const title = `${post.title} | ${SITE_TITLE}`
    const description = post.excerpt || SITE_DESCRIPTION
    const url = `${SITE_URL}${post.permalink}`
    const image = `${SITE_URL}${post.thumbnail ?? DEFAULT_OGP_IMAGE}`
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    }
  },
  notFoundComponent: NotFoundComponent,
})

function PostPage() {
  const { post } = Route.useLoaderData()
  return (
    <Layout>
      <Article
        path={post.permalink}
        title={post.title}
        created_at={post.created_at}
        categories={post.category ? [post.category] : null}
        tags={post.tags ?? null}
        html={post.body}
        site={SITE_META}
      />
    </Layout>
  )
}

function NotFoundComponent() {
  return (
    <Layout>
      <main>
        <h1>404 — Not Found</h1>
        <p>This permalink does not match any post.</p>
      </main>
    </Layout>
  )
}
