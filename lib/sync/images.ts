import { existsSync } from "node:fs"
import { rename, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { ImageRef } from "./types"

export interface DownloadOptions {
  fetch?: typeof globalThis.fetch
}

export async function downloadImages(
  refs: ImageRef[],
  targetDir: string,
  opts: DownloadOptions = {},
): Promise<void> {
  const fetcher = opts.fetch ?? globalThis.fetch
  for (const ref of refs) {
    const dest = join(targetDir, ref.filename)
    if (existsSync(dest)) continue
    const r = await fetcher(ref.url)
    if (!r.ok) throw new Error(`image fetch ${ref.url} -> ${r.status}`)
    const buf = new Uint8Array(await r.arrayBuffer())
    const tmp = `${dest}.tmp`
    await writeFile(tmp, buf)
    try {
      await rename(tmp, dest)
    } catch (err) {
      await unlink(tmp).catch(() => {})
      throw err
    }
  }
}
