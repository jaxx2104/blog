import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test, vi } from "vitest"
import { CosenseClient } from "./cosense-client"
import { cosenseListResponseSchema, cosensePageSchema } from "./types"

const listJson = JSON.parse(
  readFileSync(resolve(__dirname, "__fixtures__/pages-list.json"), "utf8"),
)
const detailJson = JSON.parse(
  readFileSync(resolve(__dirname, "__fixtures__/page-detail.json"), "utf8"),
)

describe("schemas accept captured fixtures", () => {
  test("list response", () => {
    expect(() => cosenseListResponseSchema.parse(listJson)).not.toThrow()
  })
  test("page detail", () => {
    expect(() => cosensePageSchema.parse(detailJson)).not.toThrow()
  })
})

describe("CosenseClient", () => {
  test("listPages hits /api/pages/<project> and parses response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(listJson), { status: 200 }),
      )
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    const result = await c.listPages()
    expect(result.pages).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scrapbox.io/api/pages/demo?limit=1000&skip=0",
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "connect.sid=s" }),
      }),
    )
  })

  test("getPage URL-encodes the title", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(detailJson), { status: 200 }),
      )
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    await c.getPage("Hello World")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scrapbox.io/api/pages/demo/Hello%20World",
      expect.any(Object),
    )
  })

  test("non-2xx throws", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("x", { status: 503 }))
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    await expect(c.listPages()).rejects.toThrow(/503/)
  })

  test("listPages walks the project via skip-loop until count is reached", async () => {
    const page1 = {
      count: 3,
      pages: [
        { id: "0123456789abcdef01234567", title: "A", updated: 1 },
        { id: "fedcba9876543210fedcba98", title: "B", updated: 2 },
      ],
    }
    const page2 = {
      count: 3,
      pages: [{ id: "1111111111111111111111aa", title: "C", updated: 3 }],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }))
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    const result = await c.listPages()
    expect(result.pages).toHaveLength(3)
    expect(result.pages.map((p) => p.title)).toEqual(["A", "B", "C"])
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://scrapbox.io/api/pages/demo?limit=1000&skip=0",
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://scrapbox.io/api/pages/demo?limit=1000&skip=2",
      expect.any(Object),
    )
  })

  test("listPages stops on the first empty page even if count claims more", async () => {
    const page1 = {
      count: 100,
      pages: [{ id: "0123456789abcdef01234567", title: "A", updated: 1 }],
    }
    const page2 = { count: 100, pages: [] }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }))
    const c = new CosenseClient({ project: "demo", sid: "s", fetch: fetchMock })
    const result = await c.listPages()
    expect(result.pages).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
