"use client"

import React from "react"
import { ThemeProvider } from "@/lib/ThemeContext"
import GlobalStyles from "@/styles/global-style"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  )
}
