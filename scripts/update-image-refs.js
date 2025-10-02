const fs = require("fs")
const path = require("path")

const POSTS_DIR = path.join(process.cwd(), "content/posts")

function updateMarkdownImageRefs(mdPath) {
  let content = fs.readFileSync(mdPath, "utf8")
  let updated = false

  // Replace image references: .jpg/.jpeg/.png -> .webp
  const newContent = content.replace(
    /!\[([^\]]*)\]\(([^)]+)\.(jpg|jpeg|png)\)/gi,
    (match, alt, imagePath, ext) => {
      updated = true
      return `![${alt}](${imagePath}.webp)`
    }
  )

  if (updated) {
    fs.writeFileSync(mdPath, newContent, "utf8")
    return true
  }
  return false
}

function findMarkdownFiles(dir) {
  const files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath))
    } else if (item === "index.md") {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  console.log("🔍 Markdownファイルを検索中...")
  const mdFiles = findMarkdownFiles(POSTS_DIR)
  console.log(`📊 ${mdFiles.length}件のMarkdownファイルを発見しました\n`)

  let updatedCount = 0

  for (const mdPath of mdFiles) {
    const updated = updateMarkdownImageRefs(mdPath)
    if (updated) {
      updatedCount++
      console.log(`✅ 更新: ${path.relative(POSTS_DIR, mdPath)}`)
    }
  }

  console.log(`\n📈 ${updatedCount}件のMarkdownファイルを更新しました`)
}

main().catch(console.error)
