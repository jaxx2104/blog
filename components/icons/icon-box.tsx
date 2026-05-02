import type React from "react"
import Icon from "./icon"
import styles from "./icon-box.module.css"

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
