import type React from "react"
import styles from "./slide-image.module.css"

interface Props {
  src: string
  alt: string
  title: string
}

const SlideImage: React.FC<Props> = ({ src, alt, title }) => (
  <div className={styles.wrapper}>
    <img
      className={styles.image}
      src={src}
      alt={alt}
      width={200}
      height={150}
      loading="lazy"
    />
    <p className={styles.capture}>{title}</p>
  </div>
)

export default SlideImage
