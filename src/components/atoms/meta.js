import React from "react"
import Helmet from "react-helmet"
import get from "lodash/get"

const Meta = ({ image, path = "", site, title }) => {
  const siteUrl = get(site, "url")
  const siteTitle = get(site, "title")
  title = title ? `${title} | ${siteTitle}` : siteTitle
  image = image ? `${siteUrl}${image}` : `${siteUrl}/img/back.jpeg`
  return (
    <Helmet
      title={title}
      meta={[
        { name: "twitter:card", content: "summary" },
        {
          name: "twitter:site",
          content: `@${get(site, "twitter")}`
        },
        { property: "og:title", content: title },
        { property: "og:type", content: "website" },
        {
          property: "og:description",
          content: get(site, "description")
        },
        {
          property: "og:url",
          content: `${siteUrl}${path}`
        },
        {
          property: "og:image",
          content: image
        }
      ]}
    />
  )
}
export default Meta
