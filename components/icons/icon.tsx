import { type IconName, library } from "@fortawesome/fontawesome-svg-core"
import {
  faApple,
  faAws,
  faFacebook,
  faGithub,
  faHtml5,
  faJs,
  faNode,
  faPhp,
  faReact,
  faTwitter,
  faVuejs,
} from "@fortawesome/free-brands-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type React from "react"
import styles from "./icon.module.css"

library.add(
  faAws,
  faApple,
  faPhp,
  faHtml5,
  faJs,
  faReact,
  faVuejs,
  faTwitter,
  faFacebook,
  faGithub,
  faNode,
)

interface Props {
  name: string
  size?: number
}

const Icon: React.FC<Props> = ({ name, size }) => (
  <i
    className={styles.icon}
    style={
      size !== undefined
        ? ({ "--icon-size": `${size}rem` } as React.CSSProperties)
        : undefined
    }
  >
    <FontAwesomeIcon icon={["fab", name as IconName]} width="20px" />
  </i>
)

export default Icon
