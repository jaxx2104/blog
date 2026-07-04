import type React from "react"
import { FacebookShareButton, TwitterShareButton } from "react-share"
import styles from "./icon-share.module.css"

interface Props {
  url: string
  title: string
}

const Share: React.FC<Props> = ({ url, title }) => (
  <div className={styles.share}>
    <TwitterShareButton
      url={url}
      title={title}
      className={styles.button}
      resetButtonStyle={false}
    >
      Share — X
    </TwitterShareButton>
    <FacebookShareButton
      url={url}
      className={styles.button}
      resetButtonStyle={false}
    >
      Share — Facebook
    </FacebookShareButton>
  </div>
)

export default Share
