import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomeStub,
  head: () => ({
    meta: [
      { title: "jaxx2104.info — Phase 1 stub" },
      {
        name: "description",
        content: "TanStack Start migration phase 1 placeholder",
      },
    ],
  }),
})

function HomeStub() {
  return (
    <main>
      <h1>jaxx2104.info</h1>
      <p>
        TanStack Start migration in progress (Phase 1). Real content will land
        in Phase 2.
      </p>
    </main>
  )
}
