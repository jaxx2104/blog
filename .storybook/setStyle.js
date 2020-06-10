import { ThemeProvider } from "styled-components"
import { boolean } from "@storybook/addon-knobs"
import React from "react"

import { dark, light } from "styles/theme"
import GlobalStyle from "styles/global-style"

const setStyle = (stories) => {
  stories.addDecorator((story) => {
    const theme = boolean("theme", true)
    return (
      <ThemeProvider theme={theme ? light : dark}>
        <>
          <GlobalStyle />
          {story()}
        </>
      </ThemeProvider>
    )
  })
}
export default setStyle
