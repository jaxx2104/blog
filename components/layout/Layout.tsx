"use client"

import React from "react"
import Navi from "@/components/layout/Navi"
import Footer from "@/components/layout/Footer"

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
