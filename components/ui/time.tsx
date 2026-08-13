import type React from "react"
import styles from "./time.module.css"

interface Props {
  created_at: string
}

/**
 * created_at は Velite が UTC の ISO 8601 で出力する（例 2013-08-06T00:22:48.000Z）。
 * Date を経由して整形すると実行環境のタイムゾーンで日付が動いてしまい、
 * UTC で走る CI のプリレンダー結果とブラウザのローカル時刻で 1 日ずれる。
 * ここでは日付部分を文字列のまま切り出すことで、どの環境でも同じ値を返す。
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

const formatDate = (isoDate: string): string => {
  const matched = ISO_DATE.exec(isoDate)
  return matched ? `${matched[1]}/${matched[2]}/${matched[3]}` : isoDate
}

const Time: React.FC<Props> = ({ created_at }) => {
  const formattedDate = formatDate(created_at)
  return (
    <time className={styles.time} dateTime={created_at}>
      {formattedDate}
    </time>
  )
}

export default Time
