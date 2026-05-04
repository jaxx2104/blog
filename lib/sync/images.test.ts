import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { downloadImages } from "./images"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sync-img-"))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

test("downloads each image once", async () => {
  const fetchMock = vi.fn(
    async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
  )
  await downloadImages(
    [
      { url: "https://gyazo.com/a.png", filename: "a.png" },
      { url: "https://gyazo.com/b.png", filename: "b.png" },
    ],
    dir,
    { fetch: fetchMock },
  )
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(Buffer.from(readFileSync(join(dir, "a.png")))).toEqual(
    Buffer.from([1, 2, 3]),
  )
  expect(Buffer.from(readFileSync(join(dir, "b.png")))).toEqual(
    Buffer.from([1, 2, 3]),
  )
})

test("skips files that already exist", async () => {
  writeFileSync(join(dir, "a.png"), new Uint8Array([9]))
  const fetchMock = vi.fn(
    async () => new Response(new Uint8Array([1]), { status: 200 }),
  )
  await downloadImages(
    [{ url: "https://gyazo.com/a.png", filename: "a.png" }],
    dir,
    { fetch: fetchMock },
  )
  expect(fetchMock).not.toHaveBeenCalled()
  expect(statSync(join(dir, "a.png")).size).toBe(1)
})

test("propagates fetch failure", async () => {
  const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }))
  await expect(
    downloadImages(
      [{ url: "https://gyazo.com/a.png", filename: "a.png" }],
      dir,
      { fetch: fetchMock },
    ),
  ).rejects.toThrow(/404/)
})

test("does not leave a .tmp file when fetch succeeds", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(new Uint8Array([5]), { status: 200 }))
  await downloadImages(
    [{ url: "https://gyazo.com/c.png", filename: "c.png" }],
    dir,
    { fetch: fetchMock },
  )
  expect(Buffer.from(readFileSync(join(dir, "c.png")))).toEqual(
    Buffer.from([5]),
  )
  expect(() => statSync(join(dir, "c.png.tmp"))).toThrow()
})
