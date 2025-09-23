import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import rehypePrettyCode from "rehype-pretty-code"

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
          const { data } = matter(fileContents)

          return {
            slug: dir,
            title: data.title || "",
            created_at: data.created_at || "",
            updated_at: data.updated_at || "",
            path: data.path || `/${dir}`,
            category: data.category,
            tags: data.tags,
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

  // Convert images to data URIs
  const postDir = path.join(postsDirectory, slug)
  let contentWithDataUris = content

  // Find all image references (both ./image.jpg and image.jpg patterns)
  const imageRegex = /!\[([^\]]*)\]\((\.\/)?([^)]+\.(jpg|jpeg|png|gif))\)/gi
  const matches = [...contentWithDataUris.matchAll(imageRegex)]

  for (const match of matches) {
    const fullMatch = match[0]
    const altText = match[1]
    const filename = match[3]
    const imagePath = path.join(postDir, filename)

    try {
      if (fs.existsSync(imagePath)) {
        // Read image and convert to base64
        const imageBuffer = fs.readFileSync(imagePath)
        const base64 = imageBuffer.toString("base64")

        // Determine MIME type
        const ext = path.extname(filename).toLowerCase()
        let mimeType = "image/jpeg"
        if (ext === ".png") mimeType = "image/png"
        else if (ext === ".gif") mimeType = "image/gif"
        else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg"

        // Create data URI - base64が長すぎるとremarkが処理できない可能性があるため、HTMLタグとして埋め込む
        const imgTag = `<img src="data:${mimeType};base64,${base64}" alt="${altText}" />`

        // Replace image reference with HTML img tag
        contentWithDataUris = contentWithDataUris.replace(fullMatch, imgTag)
      }
    } catch (error) {
      console.error(`Failed to convert image ${filename} to data URI:`, error)
    }
  }

  // HTMLタグを含むコンテンツを処理
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePrettyCode, {
      theme: "dracula",
      keepBackground: true,
      defaultLang: "plaintext",
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(contentWithDataUris)

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
