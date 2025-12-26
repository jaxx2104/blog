import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPostByPath, getAllPosts } from "@/lib/posts"
import Layout from "@/components/layout/layout"
import Article, { SiteMetaType } from "@/components/features/article/article"

interface PostPageProps {
  params: Promise<{
    slug: string[]
  }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.path.replace(/^\//, "").split("/"),
  }))
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const postPath = "/" + slug.join("/")
  const post = await getPostByPath(postPath)

  if (!post) {
    return {
      title: "Not Found",
    }
  }

  const siteUrl = "https://jaxx2104.info"
  const title = `${post.title} | jaxx2104.info`
  const description = post.content?.split(/\n/)[0] || ""
  const url = `${siteUrl}${post.path}`
  const imageUrl = post.thumbnail ? `${siteUrl}${post.thumbnail}` : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "jaxx2104.info",
      type: "article",
      ...(imageUrl && {
        images: [{ url: imageUrl }],
      }),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl && {
        images: [imageUrl],
      }),
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const path = "/" + slug.join("/")
  const post = await getPostByPath(path)

  if (!post) {
    notFound()
  }

  const siteMeta: SiteMetaType = {
    title: "jaxx2104.info",
    description: "プログラムとバグが好き",
    siteUrl: "https://jaxx2104.info",
    author: "jaxx2104",
    twitter: "jaxx2104",
  }

  return (
    <Layout>
      <Article
        path={post.path}
        title={post.title}
        created_at={post.created_at}
        categories={post.category ? [post.category] : null}
        tags={post.tags || null}
        html={post.html || ""}
        site={siteMeta}
      />
    </Layout>
  )
}
