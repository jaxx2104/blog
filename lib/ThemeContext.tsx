"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { ThemeProvider as StyledThemeProvider } from "styled-components"
import { lightTheme, darkTheme } from "@/styles/theme"

type ThemeMode = "light" | "dark"

interface ThemeContextType {
  theme: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("light")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      setTheme(prefersDark ? "dark" : "light")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  const currentTheme = theme === "light" ? lightTheme : darkTheme

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <StyledThemeProvider theme={currentTheme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  )
}
