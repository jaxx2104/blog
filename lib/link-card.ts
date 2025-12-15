import ogs from "open-graph-scraper"

export interface OgpData {
  title: string
  description: string
  image: string
  url: string
  siteName: string
}

const ogpCache = new Map<string, OgpData>()

export async function fetchOgp(url: string): Promise<OgpData | null> {
  if (ogpCache.has(url)) {
    return ogpCache.get(url)!
  }

  try {
    const { result } = await ogs({
      url,
      timeout: 10000,
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      },
    })

    if (result.success) {
      const ogpData: OgpData = {
        title: result.ogTitle || result.dcTitle || extractTitleFromUrl(url),
        description: result.ogDescription || result.dcDescription || "",
        image: result.ogImage?.[0]?.url || "",
        url: result.ogUrl || url,
        siteName: result.ogSiteName || extractDomain(url),
      }
      ogpCache.set(url, ogpData)
      return ogpData
    }
  } catch (error) {
    console.warn(`Failed to fetch OGP for ${url}:`, error)
  }

  // Fallback: return basic data from URL
  const fallbackData: OgpData = {
    title: extractTitleFromUrl(url),
    description: "",
    image: "",
    url,
    siteName: extractDomain(url),
  }
  ogpCache.set(url, fallbackData)
  return fallbackData
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split("/").filter(Boolean).pop()
    return lastSegment || extractDomain(url)
  } catch {
    return url
  }
}

export function generateLinkCardHtml(ogp: OgpData): string {
  const imageHtml = ogp.image
    ? `<div class="link-card-image"><img src="${escapeHtml(
        ogp.image
      )}" alt="" loading="lazy" /></div>`
    : `<div class="link-card-image link-card-no-image"><span>${escapeHtml(
        ogp.siteName.charAt(0).toUpperCase()
      )}</span></div>`

  return `<a href="${escapeHtml(
    ogp.url
  )}" class="link-card" target="_blank" rel="noopener noreferrer">
  ${imageHtml}
  <div class="link-card-content">
    <div class="link-card-title">${escapeHtml(ogp.title)}</div>
    <div class="link-card-description">${escapeHtml(ogp.description)}</div>
    <div class="link-card-site">${escapeHtml(ogp.siteName)}</div>
  </div>
</a>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
