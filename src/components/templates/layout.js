import { ThemeProvider } from 'styled-components'
import emergence from 'emergence.js'
import Helmet from 'react-helmet'
import React from 'react'

import { siteMetadata } from '~/gatsby-config'
import storage from 'plugins/storage'

import { light, dark } from 'styles/theme'
import GlobalStyle from 'styles/global-style'
import Footer from 'components/organisms/footer'
import Navi from 'components/organisms/navi'

class Layout extends React.Component {
  constructor() {
    super()
    this.toggleTheme = this.toggleTheme.bind(this)
  }

  state = {
    theme: true,
  }

  async componentWillMount() {
    if (typeof window !== 'undefined') {
      emergence.init()
      const theme = await storage.getItem('theme')
      this.setState({ theme })
    }
  }

  toggleTheme() {
    const theme = !this.state.theme
    storage.setItem('theme', theme)
    this.setState({ theme })
  }

  render() {
    const { children } = this.props
    return (
      <ThemeProvider theme={this.state.theme ? dark : light}>
        <div>
          <Helmet
            bodyAttributes={{
              class: this.state.theme ? 'dark' : 'light',
            }}
          />
          <Navi
            title={siteMetadata.title}
            isDarkMode={this.state.theme}
            onDarkMode={this.toggleTheme}
          />
          {children}
          <Footer title={siteMetadata.title} author={siteMetadata.author} />
          <GlobalStyle />
        </div>
      </ThemeProvider>
    )
  }
}

export default Layout
