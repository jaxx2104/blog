import type React from "react"
import styles from "./icon-box.module.css"
import Icon from "./icon"

interface Props {
  label: string
  icon: string
}

const Box: React.FC<Props> = ({ label, icon }) => (
  <div className={styles.box} title={label}>
    <Icon name={icon} />
  </div>
)

export default Box
