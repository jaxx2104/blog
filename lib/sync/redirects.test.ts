import { describe, expect, test } from "vitest"
import { emitRedirects, type RedirectSeedEntry } from "./redirects"

describe("emitRedirects", () => {
  test("empty seed -> empty string", () => {
    expect(emitRedirects([])).toBe("")
  })

  test("emits one 308 line per entry", () => {
    const seed: RedirectSeedEntry[] = [
      { old_path: "/2025-purchases", new_id: "0123456789abcdef01234567" },
      { old_path: "/php-replace-lf", new_id: "fedcba9876543210fedcba98" },
    ]
    expect(emitRedirects(seed)).toBe(
      [
        "/2025-purchases /0123456789abcdef01234567/ 308",
        "/php-replace-lf /fedcba9876543210fedcba98/ 308",
        "",
      ].join("\n"),
    )
  })

  test("throws on duplicate old_path", () => {
    expect(() =>
      emitRedirects([
        { old_path: "/x", new_id: "0123456789abcdef01234567" },
        { old_path: "/x", new_id: "fedcba9876543210fedcba98" },
      ]),
    ).toThrow(/duplicate/i)
  })
})
