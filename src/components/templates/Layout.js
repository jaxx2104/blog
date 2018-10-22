import emergence from 'emergence.js'
import React from 'react'

import { siteMetadata } from '../../../gatsby-config'
import { ThemeProvider } from 'styled-components'
import Footer from 'components/organisms/Footer'
import GlobalStyle from './Style'
import Navi from 'components/organisms/Navi'
import Theme from './Theme'

class Layout extends React.Component {
  componentDidMount() {
    emergence.init()
  }

  componentDidUpdate() {
    emergence.init()
  }

  render() {
    const { children } = this.props
    return (
      <ThemeProvider theme={Theme}>
        <div>
          <Navi title={siteMetadata.title} {...this.props} />
          {children}
          <Footer title={siteMetadata.title} author={siteMetadata.author} />
          <GlobalStyle />
        </div>
      </ThemeProvider>
    )
  }
}

export default Layout
