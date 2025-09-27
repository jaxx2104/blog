"use client"

import React from "react"
import Navi from "@/components/layout/navi"
import Footer from "@/components/layout/footer"

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
