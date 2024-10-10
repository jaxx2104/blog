import React from "react"

export type Site = {
  title: string
  description: string
  siteUrl: string
  author: string
  twitter: string
  adsense: string
}

interface Props {
  image?: string
  path?: string
  site: Site
  title?: string
}

const Meta: React.FC<Props> = ({ image, path = "", site, title }: Props) => {
  const siteUrl = site.siteUrl
  const siteTitle = site.title || ""
  const siteDescription = site.description || ""
  const metaTitle = title ? `${title} | ${siteTitle}` : siteTitle
  const metaImage = image ? `${siteUrl}${image}` : `${siteUrl}/img/back.jpeg`

  return (
    <>
      <title>{metaTitle}</title>
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content={`@${site.twitter}`} />
      <meta name="og:title" content={metaTitle} />
      <meta name="og:type" content="website" />
      <meta name="og:description" content={siteDescription} />
      <meta name="og:url" content={`${siteUrl}${path}`} />
      <meta name="og:image" content={metaImage} />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@100;300;400;500;700;900&family=Permanent+Marker&display=swap"
        rel="stylesheet"
      />
    </>
  )
}
export default Meta
