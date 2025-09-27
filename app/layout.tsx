import type { Metadata } from "next"
import { Noto_Sans_JP, Permanent_Marker } from "next/font/google"
import StyledComponentsRegistry from "@/lib/registry"
import Providers from "@/components/Providers"
import "modern-normalize/modern-normalize.css"
import "font-awesome/css/font-awesome.css"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "900"],
  display: "swap",
  variable: "--font-noto-sans-jp",
})

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-permanent-marker",
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
      <body className={`${notoSansJP.className} ${permanentMarker.variable}`}>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
