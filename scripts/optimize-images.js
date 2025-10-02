const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const IMAGE_DIR = path.join(process.cwd(), "content/posts")
const MAX_WIDTH = 1200
const QUALITY = 80

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    return null
  }

  const stats = fs.statSync(filePath)
  const originalSize = stats.size

  // Skip if already webp
  if (ext === ".webp") {
    return null
  }

  // Create backup
  const backupPath = filePath + ".original"
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath)
  }

  // Optimize image
  const image = sharp(filePath)
  const metadata = await image.metadata()

  let optimizedImage = image

  // Resize if wider than MAX_WIDTH
  if (metadata.width > MAX_WIDTH) {
    optimizedImage = optimizedImage.resize(MAX_WIDTH, null, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  // Convert to WebP
  optimizedImage = optimizedImage.webp({ quality: QUALITY })

  // Change extension to .webp
  const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, ".webp")
  await optimizedImage.toFile(webpPath + ".tmp")

  const newStats = fs.statSync(webpPath + ".tmp")
  const newSize = newStats.size

  // Only replace if new file is smaller
  if (newSize < originalSize) {
    fs.renameSync(webpPath + ".tmp", webpPath)
    // Remove original file (backup exists)
    fs.unlinkSync(filePath)
    return {
      path: webpPath,
      originalPath: filePath,
      originalSize,
      newSize,
      saved: originalSize - newSize,
      savedPercent: ((1 - newSize / originalSize) * 100).toFixed(1),
    }
  } else {
    fs.unlinkSync(webpPath + ".tmp")
    return {
      path: filePath,
      originalPath: filePath,
      originalSize,
      newSize: originalSize,
      saved: 0,
      savedPercent: 0,
    }
  }
}

async function findImages(dir) {
  const files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...(await findImages(fullPath)))
    } else if (IMAGE_EXTENSIONS.includes(path.extname(item).toLowerCase())) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  console.log("🔍 画像ファイルを検索中...")
  const images = await findImages(IMAGE_DIR)
  console.log(`📊 ${images.length}枚の画像を発見しました\n`)

  let totalOriginal = 0
  let totalNew = 0
  const results = []

  for (const imagePath of images) {
    process.stdout.write(`⚙️  最適化中: ${path.relative(IMAGE_DIR, imagePath)}...`)
    const result = await optimizeImage(imagePath)

    if (result) {
      totalOriginal += result.originalSize
      totalNew += result.newSize
      results.push(result)
      console.log(
        ` ${(result.originalSize / 1024).toFixed(0)}KB → ${(result.newSize / 1024).toFixed(0)}KB (-${result.savedPercent}%)`
      )
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("📈 最適化結果サマリー")
  console.log("=".repeat(80))
  console.log(`総ファイル数: ${results.length}枚`)
  console.log(`元のサイズ: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`)
  console.log(`最適化後: ${(totalNew / 1024 / 1024).toFixed(2)}MB`)
  console.log(
    `削減量: ${((totalOriginal - totalNew) / 1024 / 1024).toFixed(2)}MB (-${(((totalOriginal - totalNew) / totalOriginal) * 100).toFixed(1)}%)`
  )
  console.log("=".repeat(80))
  console.log("\n💡 元の画像は .original ファイルとしてバックアップされています")
}

main().catch(console.error)
