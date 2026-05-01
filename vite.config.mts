import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 3000,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "assets/[name]-[hash].js",
          },
        },
      },
      resolve: {
        // styled-components has a CJS default export that does not
        // round-trip cleanly through Vite/rolldown's ESM externalization
        // in the SSR bundle (yields `styled.article is not a function`).
        // Bundling it into the SSR output sidesteps the interop hole.
        noExternal: ["styled-components"],
      },
    },
  },
  plugins: [
    tanstackStart({
      srcDirectory: "app",
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
      },
    }),
    viteReact(),
  ],
})
