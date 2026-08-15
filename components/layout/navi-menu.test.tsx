/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import NaviMenu from "./navi-menu"

// The real Link resolves against a router context. The menu's own behaviour
// does not depend on routing, so a plain anchor keeps the spec free of a
// router fixture.
vi.mock("@/lib/router-link", () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

afterEach(cleanup)

describe("NaviMenu", () => {
  it("renders an action item as a button that assistive tech can name", () => {
    render(
      <NaviMenu items={[{ label: "テーマを切り替える", action: vi.fn() }]} />,
    )

    const button = screen.getByRole("button", { name: "テーマを切り替える" })
    expect(button.tagName).toBe("BUTTON")
    // Without an explicit type a button inside a form submits it.
    expect(button.getAttribute("type")).toBe("button")
  })

  it("gives the action item keyboard focus", () => {
    // The regression this guards: the toggle used to be a <p onClick>, which
    // takes no focus and so could only ever be operated with a mouse.
    render(
      <NaviMenu items={[{ label: "テーマを切り替える", action: vi.fn() }]} />,
    )

    const button = screen.getByRole("button")
    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it("runs the action on activation", () => {
    const action = vi.fn()
    render(<NaviMenu items={[{ label: "テーマを切り替える", action }]} />)

    fireEvent.click(screen.getByRole("button"))
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("renders a link item as an anchor", () => {
    render(<NaviMenu items={[{ text: "Home", to: "/" }]} />)

    const link = screen.getByRole("link", { name: "Home" })
    expect(link.getAttribute("href")).toBe("/")
  })

  it("keeps the theme glyph out of the markup", () => {
    // It comes from CSS keyed on <html data-theme>, so the prerendered HTML
    // does not commit to a theme the visitor may not be using.
    const { container } = render(
      <NaviMenu items={[{ label: "テーマを切り替える", action: vi.fn() }]} />,
    )

    expect(container.textContent).toBe("")
  })
})
