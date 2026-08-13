import { join } from "node:path"
import type { Element, Root } from "hast"
import sharp from "sharp"
import { visit } from "unist-util-visit"
import { assets, context } from "velite"

/** `output.base` in velite.config.ts. */
const ASSET_URL_PREFIX = "/images/posts/"

/**
 * Absolute `output.assets`. Velite resolves it against the config's own
 * directory, so this holds wherever the build was launched from — and unlike
 * `import.meta.url`, it survives velite bundling this module into its temp
 * config file.
 */
function assetOutputDir(): string | undefined {
  try {
    return context().config.output.assets
  } catch {
    return undefined // called outside a velite parse (e.g. a unit test)
  }
}

/**
 * A first image sitting behind more than this many top-level blocks is
 * assumed to be below the fold and stays lazy. Three covers the common
 * "lead paragraph, then screenshot" shape without eagerly fetching an image
 * buried under a long intro.
 */
const EAGER_BLOCK_LIMIT = 3

type Dimensions = { width: number; height: number }

/** One post's images recur across builds and across posts; measure once. */
const dimensionCache = new Map<string, Dimensions | null>()

/**
 * Absolute path of the file behind a rewritten asset URL.
 *
 * Velite's own `rehypeCopyLinkedFiles` runs ahead of the plugins configured
 * here (it is unshifted onto the list in velite's `markdown` schema), so by
 * the time this plugin sees the tree, `src` is already the flat
 * `/images/posts/<name>-<hash>.<ext>` URL. The file itself is *not* on disk
 * yet: velite registers assets in an in-memory map while parsing and only
 * copies them in `outputAssets`, after every collection resolves — and
 * `output.clean` has emptied the directory before that. Reading
 * public/images/posts/ directly would therefore find nothing on a clean
 * build, so the map is the primary lookup and the output directory is only
 * a fallback for watch rebuilds.
 */
function sourcePath(src: string): string | undefined {
  if (!src.startsWith(ASSET_URL_PREFIX)) return undefined
  const name = src.slice(ASSET_URL_PREFIX.length).replace(/[?#].*$/, "")
  if (name === "" || name.includes("/")) return undefined
  const registered = assets.get(name)
  if (registered !== undefined) return registered
  const dir = assetOutputDir()
  return dir === undefined ? undefined : join(dir, name)
}

async function readDimensions(path: string): Promise<Dimensions | null> {
  const cached = dimensionCache.get(path)
  if (cached !== undefined) return cached

  let result: Dimensions | null = null
  try {
    const { width, height, pageHeight } = await sharp(path).metadata()
    // Animated WebP/GIF report every frame stacked in `height`; `pageHeight`
    // is the one frame the browser lays out.
    const frameHeight = pageHeight ?? height
    if (width && frameHeight) result = { width, height: frameHeight }
  } catch {
    // Missing or undecodable image. Two posts link images that were never
    // committed, and failing here would take the whole build down.
    result = null
  }
  dimensionCache.set(path, result)
  return result
}

/** Every `<img>` in the tree, tagged with the top-level block it sits in. */
function collectImages(tree: Root): Array<{ node: Element; block: number }> {
  const found: Array<{ node: Element; block: number }> = []
  let block = -1
  for (const child of tree.children) {
    if (child.type !== "element") continue
    block += 1
    const at = block
    visit(child, "element", (node: Element) => {
      if (node.tagName === "img") found.push({ node, block: at })
    })
  }
  return found
}

/**
 * Give body images intrinsic `width`/`height` so the browser can reserve
 * their box before the bytes arrive, and mark everything but the lead image
 * as lazily loaded.
 *
 * Author-supplied attributes always win: a post that already sets `width`,
 * `height` or `loading` by hand is left as it is.
 */
export default function rehypeImage() {
  return async (tree: Root) => {
    const images = collectImages(tree)
    if (images.length === 0) return

    // Only the first image can be the LCP element, and only if it is near
    // the top. Everything else defers.
    const lead =
      images[0].block < EAGER_BLOCK_LIMIT ? images[0].node : undefined

    await Promise.all(
      images.map(async ({ node }) => {
        node.properties ??= {}
        const properties = node.properties

        if (properties.loading == null) {
          properties.loading = node === lead ? "eager" : "lazy"
        }
        if (properties.decoding == null) properties.decoding = "async"
        if (node === lead && properties.fetchPriority == null) {
          properties.fetchPriority = "high"
        }

        // Setting only one of the pair would give the browser a bogus aspect
        // ratio, so an image that carries either is left untouched.
        if (properties.width != null || properties.height != null) return
        const src = properties.src
        if (typeof src !== "string") return
        const path = sourcePath(src)
        if (path === undefined) return // remote image: nothing to measure
        const size = await readDimensions(path)
        if (size === null) return
        properties.width = size.width
        properties.height = size.height
      }),
    )
  }
}
