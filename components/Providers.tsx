"use client"

import React from "react"
import { ThemeProvider } from "styled-components"
import GlobalStyles from "@/styles/global-style"
import { lightTheme } from "@/styles/theme"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={lightTheme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  )
}
