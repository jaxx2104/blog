/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import "modern-normalize/modern-normalize.css"
import "@/styles/tokens.css"
import "@/styles/global.css"
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site"
import { ThemeProvider } from "@/lib/ThemeContext"

/**
 * 日本語だけは self-host できないので Google Fonts から読む。
 * `head()` の links に rel="stylesheet" を置くと TanStack の Asset が
 * React 19 の precedence="default" を自動で付けてしまい、React 管理の
 * render-blocking リソースになる。それを避けるため、この 1 枚だけは
 * RootDocument 内で media="print" のまま挿入し、読み込み完了後に
 * media="all" へ切り替えて適用する（font-display: swap は URL 側で維持）。
 */
const NOTO_SERIF_JP_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;700&display=swap"

const NOTO_SERIF_JP_LOADER = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(
  NOTO_SERIF_JP_HREF,
)};l.media='print';l.onload=function(){l.onload=null;l.media='all';};document.head.appendChild(l);})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:site_name", content: SITE_TITLE },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      // Matches --color-page in the light theme, so the browser chrome does
      // not sit at the old brighter pink next to the page surface.
      { name: "theme-color", content: "#ba003a" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/images/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/images/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/images/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/playfair-display-latin.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/roboto-mono-latin.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: SITE_TITLE,
        href: "/feed.xml",
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();",
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: NOTO_SERIF_JP_LOADER }} />
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<link rel="stylesheet" href="${NOTO_SERIF_JP_HREF.replace(
              /&/g,
              "&amp;",
            )}">`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
