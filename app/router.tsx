import { createRouter as createTanstackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
  return createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
  })
}

export async function getRouter() {
  return createRouter()
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
