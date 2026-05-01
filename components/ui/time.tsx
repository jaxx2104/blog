import { format, parseISO } from "date-fns"
import type React from "react"
import styles from "./time.module.css"

interface Props {
  created_at: string
}

const Time: React.FC<Props> = ({ created_at }) => {
  const formattedDate = format(parseISO(created_at), "yyyy/MM/dd")
  return (
    <time className={styles.time} dateTime={created_at}>
      {formattedDate}
    </time>
  )
}

export default Time
