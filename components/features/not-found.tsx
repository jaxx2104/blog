import type React from "react"
import Layout from "@/components/layout/layout"
import Link from "@/lib/router-link"

interface Props {
  /** What specifically was not found, when the route knows. */
  detail?: string
}

/**
 * Shared 404 body. Rendered both by the routes' `notFoundComponent` and by
 * app/routes/404.tsx, which exists so the build emits a real 404.html — see
 * the comment on `notFoundPagePlugin` in vite.config.mts.
 */
const NotFound: React.FC<Props> = ({
  detail = "The page you are looking for does not exist.",
}) => (
  <Layout>
    <main>
      <h1>404 — Not Found</h1>
      <p>{detail}</p>
      <p>
        <Link href="/">← WRITING</Link>
      </p>
    </main>
  </Layout>
)

export default NotFound
