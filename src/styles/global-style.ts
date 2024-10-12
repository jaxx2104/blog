import "modern-normalize/modern-normalize.css"
import "prismjs/themes/prism-okaidia.css"
import "font-awesome/css/font-awesome.css"

import { createGlobalStyle } from "styled-components"

const GlobalStyles = createGlobalStyle`
  body {
    -webkit-font-smoothing: antialiased;
    background-color: ${(props) => props.theme.colorBackground};
    color: ${(props) => props.theme.colorText};
    font-family: 'Noto Sans JP', sans-serif!important;
    font-weight: ${(props) => props.theme.fontWeight};
    font-size: ${(props) => `${props.theme.fontSize}rem`};
    transition: color 0.2s ease-out, background 0.2s ease-out;
    line-height: 1.25rem;
  }

  a {
    color: ${(props) => props.theme.colorMain};
    text-decoration: 'none'
  }

  .content {
    margin: 0;
    padding: 0;

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: ${(props) => `${props.theme.fontSize}rem`};
      font-weight: ${(props) => props.theme.fontWeightBold};
      margin: 2rem 0 1rem;
      line-height: 1;
      letter-spacing: -0.025rem;
    }

    p {
      font-weight: ${(props) => props.theme.fontWeight};
    }

    blockquote {
      background-color: ${(props) => props.theme.colorBackground};
      border-left: 5px solid ${(props) => props.theme.colorMain};
      color: ${(props) => props.theme.colorSub};
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
      border: 1px solid ${(props) => props.theme.colorSub};
      border-radius: 3px;
    }

  }
`
export default GlobalStyles
