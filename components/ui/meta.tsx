import Head from "next/head"

interface Props {
  title?: string
  description?: string
  url?: string
  image?: string
}

const Meta: React.FC<Props> = ({
  title = "jaxx2104.info",
  description = "I'm a front-end engineer in Japan 🗼",
  url = "https://jaxx2104.info",
  image = "/images/profile.jpg",
}) => {
  const fullTitle =
    title === "jaxx2104.info" ? title : `${title} | jaxx2104.info`

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  )
}

export default Meta
