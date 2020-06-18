import React, { useEffect } from "react"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any
  }
}

interface Props {
  clientId?: string
  slotId: string
  format: string
}

const ArticleAd: React.FC<Props> = ({ clientId, slotId, format }: Props) => {
  useEffect(() => {
    if (clientId) {
      window.adsbygoogle = (window.adsbygoogle || []).push({})
    }
  }, [clientId])

  if (!clientId) {
    return null
  }

  return (
    <div className="ad">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
      />
    </div>
  )
}

export default ArticleAd
