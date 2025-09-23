import { useEffect, useState } from "react"
import storage from "./storage"

const key = "theme"
const mode = {
  dark: "dark",
  light: "light",
} as const

type Theme = "light" | "dark"

export const useDarkMode = () => {
  const [theme, setTheme] = useState<Theme>(mode.light)

  // ダークモードの切り替え
  const toggleTheme = () => {
    switch (theme) {
      case "light":
        storage.setItem(key, mode.dark)
        setTheme(mode.dark)
        return
      default:
        storage.setItem(key, mode.light)
        setTheme(mode.light)
        return
    }
  }

  // 初期描画
  useEffect(() => {
    const getStorage = async () => {
      const localTheme = await storage.getItem<Theme>(key)
      if (localTheme) {
        setTheme(localTheme)
      }
    }
    getStorage()
  }, [])

  return { theme, toggleTheme }
}
