import {
  type CosensePage,
  cosenseListResponseSchema,
  cosensePageSchema,
} from "./types"

export interface CosenseClientOptions {
  project: string
  sid: string
  fetch?: typeof globalThis.fetch
}

const BASE = "https://scrapbox.io/api/pages"

export class CosenseClient {
  private readonly project: string
  private readonly sid: string
  private readonly fetcher: typeof globalThis.fetch

  constructor(opts: CosenseClientOptions) {
    this.project = opts.project
    this.sid = opts.sid
    this.fetcher = opts.fetch ?? globalThis.fetch
  }

  private headers(): HeadersInit {
    return { Cookie: `connect.sid=${this.sid}` }
  }

  async listPages() {
    const url = `${BASE}/${encodeURIComponent(this.project)}?limit=1000&skip=0`
    const r = await this.fetcher(url, { headers: this.headers() })
    if (!r.ok) throw new Error(`Cosense list failed: ${r.status}`)
    return cosenseListResponseSchema.parse(await r.json())
  }

  async getPage(title: string): Promise<CosensePage> {
    const url = `${BASE}/${encodeURIComponent(this.project)}/${encodeURIComponent(title)}`
    const r = await this.fetcher(url, { headers: this.headers() })
    if (!r.ok) throw new Error(`Cosense getPage failed: ${r.status}`)
    return cosensePageSchema.parse(await r.json())
  }
}
