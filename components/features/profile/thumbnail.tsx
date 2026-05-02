import type React from "react"
import styles from "./thumbnail.module.css"

interface Props {
  circle?: boolean
  size: number
  src: string
  title: string
}

const Thumbnail: React.FC<Props> = ({ circle, size, src, title }) => (
  <div
    className={styles.thumbnail}
    data-circle={circle ? "" : undefined}
    style={{ width: `${size}px`, height: `${size}px` }}
  >
    {/* biome-ignore lint/performance/noImgElement: prerender static export uses native img by design */}
    <img
      src={src}
      alt={title}
      title={title}
      width={size}
      height={size}
      loading="lazy"
    />
  </div>
)

export default Thumbnail
