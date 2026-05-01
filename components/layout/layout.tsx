import type React from "react"
import Footer from "@/components/layout/footer"
import Navi from "@/components/layout/navi"

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navi />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default Layout
