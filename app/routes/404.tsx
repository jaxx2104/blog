import { createFileRoute } from "@tanstack/react-router"
import NotFound from "@/components/features/not-found"
import { SITE_TITLE } from "@/lib/site"

/**
 * A real route for /404 so the prerender writes dist/client/404/index.html,
 * which the build then copies to dist/client/404.html.
 *
 * Cloudflare Pages looks for 404.html to answer a request with no matching
 * file; without one it falls back to single-page-application behaviour and
 * serves index.html with a 200. That is how a missing /assets/*.css came
 * back as HTML and — carrying the immutable Cache-Control from
 * public/_headers — got pinned in the edge cache for a year.
 */
export const Route = createFileRoute("/404")({
  component: NotFoundPage,
  head: () => ({
    meta: [
      { title: `404 — Not Found | ${SITE_TITLE}` },
      { name: "robots", content: "noindex" },
    ],
  }),
})

function NotFoundPage() {
  return <NotFound />
}
