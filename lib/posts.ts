import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import rehypePrettyCode from "rehype-pretty-code"
import { processImagePath } from "./image-utils"

const postsDirectory = path.join(process.cwd(), "content/posts")

export interface PostData {
  slug: string
  title: string
  created_at: string
  updated_at: string
  path: string
  category?: string
  tags?: string[]
  content?: string
  html?: string
  excerpt?: string
  thumbnail?: string
}

export async function getAllPosts(): Promise<PostData[]> {
  const postDirs = fs.readdirSync(postsDirectory)

  const posts = await Promise.all(
    postDirs.map(async (dir) => {
      const fullPath = path.join(postsDirectory, dir)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        const indexPath = path.join(fullPath, "index.md")
        if (fs.existsSync(indexPath)) {
          const fileContents = fs.readFileSync(indexPath, "utf8")
          const { data, content } = matter(fileContents)

          // Extract excerpt (first 20 characters of content)
          const plainContent = content
            .replace(/^#+\s+.*$/gm, "") // Remove headings
            .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
            .replace(/\[.*?\]\(.*?\)/g, "") // Remove links
            .replace(/<https?:\/\/[^\s>]+>/g, "") // Remove URL links
            .replace(/```[\s\S]*?```/g, "") // Remove code blocks
            .replace(/`[^`]*`/g, "") // Remove inline code
            .replace(/^[-*+]\s+/gm, "") // Remove list markers
            .replace(/\n+/g, " ") // Replace newlines with spaces
            .trim()
          const excerpt =
            plainContent.slice(0, 40) + (plainContent.length > 40 ? "..." : "")

          // Extract first image
          let thumbnail: string | undefined
          const imageMatch = content.match(/!\[.*?\]\(([^)]+)\)/)

          if (imageMatch) {
            const imageSrc = imageMatch[1]
            thumbnail = processImagePath(imageSrc, dir, fullPath)
          }

          return {
            slug: dir,
            title: data.title || "",
            created_at: data.created_at || "",
            updated_at: data.updated_at || "",
            path: data.path || `/${dir}`,
            category: data.category,
            tags: data.tags,
            excerpt,
            thumbnail,
          } as PostData
        }
      }
      return null
    })
  )

  return posts
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime()
    ) as PostData[]
}

export async function getPostBySlug(slug: string): Promise<PostData | null> {
  const fullPath = path.join(postsDirectory, slug, "index.md")

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, "utf8")
  const { data, content } = matter(fileContents)

  // Convert images to public URLs
  const postDir = path.join(postsDirectory, slug)
  let contentWithUrls = content

  // Find all image references (both ./image.jpg and image.jpg patterns)
  const imageRegex = /!\[([^\]]*)\]\((\.\/)?([^)]+\.(jpg|jpeg|png|gif))\)/gi
  const matches = [...contentWithUrls.matchAll(imageRegex)]

  for (const match of matches) {
    const fullMatch = match[0]
    const altText = match[1]
    const imageSrc = match[2]
      ? match[3]
      : match[0].match(/\(([^)]+)\)/)?.[1] || match[3]

    const publicUrl = processImagePath(imageSrc, slug, postDir)
    if (publicUrl) {
      // Replace with markdown image syntax using public URL
      const newImageTag = `![${altText}](${publicUrl})`
      contentWithUrls = contentWithUrls.replace(fullMatch, newImageTag)
    }
  }

  // Process content with markdown
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypePrettyCode, {
      theme: "dracula",
      keepBackground: true,
      defaultLang: "plaintext",
    })
    .use(rehypeStringify)
    .process(contentWithUrls)

  return {
    slug,
    title: data.title || "",
    created_at: data.created_at || "",
    updated_at: data.updated_at || "",
    path: data.path || `/${slug}`,
    category: data.category,
    tags: data.tags,
    content,
    html: processedContent.toString(),
  }
}

export async function getPostSlugs(): Promise<string[]> {
  const postDirs = fs.readdirSync(postsDirectory)

  return postDirs.filter((dir) => {
    const fullPath = path.join(postsDirectory, dir)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, "index.md")
      return fs.existsSync(indexPath)
    }
    return false
  })
}

export async function getPostByPath(
  postPath: string
): Promise<PostData | null> {
  const posts = await getAllPosts()

  // パスが一致する記事を探す
  const post = posts.find((p) => {
    // Markdownファイルに定義されたパスと比較
    return p.path === postPath
  })

  if (!post) {
    return null
  }

  // 詳細データを取得
  return getPostBySlug(post.slug)
}
