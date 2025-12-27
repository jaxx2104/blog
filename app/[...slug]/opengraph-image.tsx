import { ImageResponse } from "next/og"
import { getPostByPath, getAllPosts } from "@/lib/posts"

export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.path.replace(/^\//, "").split("/"),
  }))
}

// Google Fonts から Noto Sans JP を読み込む
async function loadGoogleFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url)).text()
    const match = css.match(/src: url\((.+?)\) format\('woff2'\)/)
    if (!match) return null
    return fetch(match[1]).then((res) => res.arrayBuffer())
  } catch {
    return null
  }
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const postPath = "/" + slug.join("/")
  const post = await getPostByPath(postPath)

  const title = post?.title || "jaxx2104.info"

  // タイトルに含まれる文字 + サイト名の文字でフォントを読み込む
  const fontData = await loadGoogleFont(title + "jaxx2104.info")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "white",
            borderRadius: "20px",
            width: "100%",
            height: "100%",
            padding: "40px 60px",
          }}
        >
          <div
            style={{
              fontSize: title.length > 30 ? 48 : 56,
              fontWeight: 700,
              color: "#1a1a1a",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: "100%",
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: "auto",
              fontSize: 28,
              color: "#666",
            }}
          >
            jaxx2104.info
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData && {
        fonts: [
          {
            name: "Noto Sans JP",
            data: fontData,
            style: "normal" as const,
            weight: 700 as const,
          },
        ],
      }),
    }
  )
}
