/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pagePath } from "@/lib/pagination"
import Pager from "./pager"

vi.mock("@/lib/router-link", () => ({
  default: ({
    href,
    children,
    rel,
  }: {
    href: string
    children?: ReactNode
    rel?: string
  }) => (
    <a href={href} rel={rel}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe("Pager", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pager page={1} pageCount={1} hrefFor={pagePath} />,
    )
    expect(container.innerHTML).toBe("")
  })

  it("marks the current page for assistive tech", () => {
    render(<Pager page={3} pageCount={6} hrefFor={pagePath} />)

    const current = screen.getByText("3")
    expect(current.getAttribute("aria-current")).toBe("page")
    // The current page is not a link — navigating to where you already are is
    // noise in a screen reader's link list.
    expect(current.tagName).not.toBe("A")
  })

  it("labels the navigation landmark", () => {
    render(<Pager page={2} pageCount={6} hrefFor={pagePath} />)
    expect(
      screen.getByRole("navigation", { name: "記事一覧のページ送り" }),
    ).toBeDefined()
  })

  it("points prev and next at the neighbouring pages", () => {
    render(<Pager page={3} pageCount={6} hrefFor={pagePath} />)

    const prev = screen.getByText("← PREV")
    const next = screen.getByText("NEXT →")
    expect(prev.getAttribute("href")).toBe("/page/2/")
    expect(prev.getAttribute("rel")).toBe("prev")
    expect(next.getAttribute("href")).toBe("/page/4/")
    expect(next.getAttribute("rel")).toBe("next")
  })

  it("degrades prev to a non-link on the first page", () => {
    render(<Pager page={1} pageCount={6} hrefFor={pagePath} />)

    const prev = screen.getByText("← PREV")
    expect(prev.tagName).toBe("SPAN")
    expect(prev.hasAttribute("data-disabled")).toBe(true)
  })

  it("hides the elision from assistive tech", () => {
    render(<Pager page={1} pageCount={20} hrefFor={pagePath} />)

    const gap = screen.getByText("…")
    expect(gap.getAttribute("aria-hidden")).toBe("true")
  })
})
