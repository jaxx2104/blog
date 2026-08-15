import type React from "react"
import Link from "@/lib/router-link"
import styles from "./navi-menu.module.css"

type LinkItem = { text: string; to: string }

/**
 * A control that runs a callback instead of navigating.
 *
 * `label` is what assistive technology announces, and it must not depend on
 * React state: the item renders as a `<button>` with no text, and the glyph
 * comes from CSS keyed on `<html data-theme>`. Prerendering happens with the
 * light theme, so a state-derived glyph made every dark-theme visitor see the
 * light icon until hydration swapped it.
 */
type ActionItem = { label: string; action: () => void }

type Item = LinkItem | ActionItem

interface Props {
  items: Item[]
}

/**
 * The theme toggle used to be a `<p onClick>` carried over from the
 * styled-components layout. A paragraph is not focusable and has no role, so
 * the only way to change the theme was a mouse click — keyboard and screen
 * reader users had none. It is a real `<button>` now.
 */
const Menu: React.FC<Props> = ({ items }) => (
  <div className={styles.menu}>
    {items.map((item) =>
      "to" in item ? (
        <Link key={item.to} href={item.to} className={styles.item}>
          {item.text}
        </Link>
      ) : (
        <button
          key={item.label}
          type="button"
          className={`${styles.item} ${styles.toggle}`}
          aria-label={item.label}
          onClick={item.action}
        />
      ),
    )}
  </div>
)

export default Menu
