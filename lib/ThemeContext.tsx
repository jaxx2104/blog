import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

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
    const root = document.documentElement
    const initial =
      (root.dataset.theme as ThemeMode | undefined) ??
      (localStorage.getItem("theme") as ThemeMode | null) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    setTheme(initial)
    root.dataset.theme = initial
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light"
      document.documentElement.dataset.theme = next
      localStorage.setItem("theme", next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
