import fs from "fs"
import path from "path"

export function ensureImageCopied(
  sourceImagePath: string,
  postSlug: string,
  imageName: string
): string {
  const targetDir = path.join(
    process.cwd(),
    "public",
    "images",
    "posts",
    postSlug
  )
  const targetPath = path.join(targetDir, imageName)
  const publicPath = `/images/posts/${postSlug}/${imageName}`

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  if (!fs.existsSync(targetPath) && fs.existsSync(sourceImagePath)) {
    fs.copyFileSync(sourceImagePath, targetPath)
  }

  return publicPath
}

export function processImagePath(
  imageSrc: string,
  postSlug: string,
  postDir: string
): string | undefined {
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
    return imageSrc
  }

  const filename = imageSrc.startsWith("./") ? imageSrc.slice(2) : imageSrc
  const sourceImagePath = path.join(postDir, filename)

  if (fs.existsSync(sourceImagePath)) {
    try {
      return ensureImageCopied(sourceImagePath, postSlug, filename)
    } catch (error) {
      console.error(`Failed to copy image ${filename}:`, error)
      return undefined
    }
  }

  return undefined
}
