import { createRouter as createTanstackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  })
}

// Required by routeTree.gen.ts — TanStack Start's runtime imports
// getRouter from #tanstack-router-entry for SSR/prerender bootstrap.
export async function getRouter() {
  return createRouter()
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
