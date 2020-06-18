import React from "react"
import { ThemeProvider } from "styled-components"
import { lightTheme, darkTheme } from "../styles/theme"
import { siteMetadata } from "../../gatsby-config"
import { useDarkMode } from "../helpers/useDarkMode"
import Footer from "../components/footer"
import GlobalStyle from "../styles/global-style"
import Navi from "./navi/navi"

interface Props {
  children?: React.ReactNode
}

const Template: React.FC<Props> = ({ children }: Props) => {
  const { theme, toggleTheme } = useDarkMode()

  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      <Navi title={siteMetadata.title} theme={theme} onDarkMode={toggleTheme} />
      {children}
      <Footer author={siteMetadata.author} />
      <GlobalStyle />
    </ThemeProvider>
  )
}

export default Template
