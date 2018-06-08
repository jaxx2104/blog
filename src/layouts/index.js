import { siteMetadata } from '../../gatsby-config'
import emergence from 'emergence.js'
import React from 'react'
import Navi from 'components/organisms/Navi'
import Footer from 'components/organisms/Footer'
import './style'
import { ThemeProvider } from 'styled-components'

class Layout extends React.Component {
  componentDidMount() {
    emergence.init()
  }

  componentDidUpdate() {
    emergence.init()
  }

  render() {
    const { children } = this.props
    const theme = {
      main: 'mediumseagreen',
    }

    return (
      <ThemeProvider theme={theme}>
        <div>
          <Navi title={siteMetadata.title} {...this.props} />
          {children()}
          <Footer title={siteMetadata.title} author={siteMetadata.author} />
        </div>
      </ThemeProvider>
    )
  }
}

export default Layout
