import type React from "react"
import Link from "@/lib/router-link"
import styles from "./pager.module.css"

interface Props {
  page: number
  pageCount: number
  /** Maps a 1-based page number to its URL, so this stays route-agnostic. */
  hrefFor: (page: number) => string
}

/**
 * First page, last page, and the pages neighbouring the current one. `null`
 * marks an elided run, so the control keeps its width as the archive grows.
 */
function pageItems(page: number, pageCount: number): (number | null)[] {
  const shown = new Set([1, pageCount, page - 1, page, page + 1])
  const items: (number | null)[] = []
  for (let n = 1; n <= pageCount; n++) {
    if (shown.has(n)) items.push(n)
    else if (items[items.length - 1] !== null) items.push(null)
  }
  return items
}

const Pager: React.FC<Props> = ({ page, pageCount, hrefFor }) => {
  if (pageCount <= 1) return null
  return (
    <nav className={styles.nav} aria-label="記事一覧のページ送り">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={styles.step} rel="prev">
          ← PREV
        </Link>
      ) : (
        <span className={styles.step} data-disabled="">
          ← PREV
        </span>
      )}
      <ol className={styles.pages}>
        {pageItems(page, pageCount).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span
                  className={styles.page}
                  data-current=""
                  aria-current="page"
                >
                  {n}
                </span>
              ) : (
                <Link href={hrefFor(n)} className={styles.page}>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={styles.step} rel="next">
          NEXT →
        </Link>
      ) : (
        <span className={styles.step} data-disabled="">
          NEXT →
        </span>
      )}
    </nav>
  )
}

export default Pager
