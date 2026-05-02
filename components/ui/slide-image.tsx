import type React from "react"
import styles from "./slide-image.module.css"

interface Props {
  src: string
  alt: string
  title: string
  animation: "fadeIn" | "slideUp" | "slideDown"
}

const SlideImage: React.FC<Props> = ({ src, alt, title, animation }) => (
  <div className={styles.wrapper} data-animation={animation}>
    {/* biome-ignore lint/performance/noImgElement: prerender static export uses native img by design */}
    <img
      className={styles.image}
      src={src}
      alt={alt}
      width={200}
      height={200}
      loading="lazy"
    />
    <p className={styles.capture}>{title}</p>
  </div>
)

export default SlideImage
