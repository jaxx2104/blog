import 'modern-normalize/modern-normalize.css'
import 'animate.css/animate.css'
import 'prismjs/themes/prism-okaidia.css'
import 'font-awesome/css/font-awesome.css'

import { createGlobalStyle } from 'styled-components'

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css?family=Noto+Sans+JP:400,900');

  body {
    -webkit-font-smoothing: antialiased;
    background-color: ${props => props.theme.background};
    color: ${props => props.theme.text};
    font-family: 'Noto Sans JP', sans-serif!important;
    font-weight: 400;
    text-size-adjust: 100%;
    transition: color 0.2s ease-out, background 0.2s ease-out;
  }

  a {
    color: ${props => props.theme.main};
    font-weight: 100;
    text-decoration: 'none'
  }

  .content {
    margin: 1rem;
    padding: 0;
    font-size: 1rem;
    line-height: 2;

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 2rem 0 1rem;
      line-height: 1;
      letter-spacing: -0.025rem;
      font-feature-settings: 'liga' 1;
    }

    p {
      font-weight: 400;
      margin: 1.75rem 0;
    }

    blockquote {
      background-color: ${props => props.theme.background};
      border-left: 5px solid ${props => props.theme.main};
      color: ${props => props.theme.sub};
      padding: 0.25em 1.5em;
      margin: 0;

      p {
        margin: 1rem 0;
      }

      a {
        display: block;
        word-break: break-word;
      }
    }

    img {
      width: 100%;
    }

    .gatsby-image-wrapper {
      border: 1px solid ${props => props.theme.sub};
      border-radius: 3px;
    }

  }
`
export default GlobalStyles
