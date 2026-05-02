import type React from "react"
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share"
import styles from "./icon-share.module.css"

interface Props {
  url: string
  title: string
}

const Share: React.FC<Props> = ({ url, title }) => (
  <div className={styles.share}>
    <TwitterShareButton url={url} title={title}>
      <TwitterIcon size={32} round={true} />
    </TwitterShareButton>
    <FacebookShareButton url={url}>
      <FacebookIcon size={32} round={true} />
    </FacebookShareButton>
  </div>
)

export default Share
