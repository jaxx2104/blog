import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import StyledComponentsRegistry from "@/lib/registry"
import Providers from "@/components/Providers"
import "modern-normalize/modern-normalize.css"
import "prismjs/themes/prism-okaidia.css"
import "font-awesome/css/font-awesome.css"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
})

export const metadata: Metadata = {
  title: "jaxx2104.info",
  description: "プログラムとバグが好き",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
