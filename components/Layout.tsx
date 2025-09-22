"use client"

import React from "react"
import Navi from "@/components/Navi"
import Footer from "@/components/Footer"

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
