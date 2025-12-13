"use client"

import { createGlobalStyle } from "styled-components"

const GlobalStyles = createGlobalStyle`
  body {
    -webkit-font-smoothing: antialiased;
    background-color: ${(props) => props.theme.colorBackground};
    color: ${(props) => props.theme.colorText};
    font-weight: ${(props) => props.theme.fontWeight};
    font-size: ${(props) => `${props.theme.fontSize}rem`};
    transition: color 0.2s ease-out, background 0.2s ease-out;
    line-height: ${(props) => props.theme.lineHeight};
  }

  a {
    color: ${(props) => props.theme.colorMain};
    text-decoration: 'none'
  }

  ul, ol {
        padding-inline-start: 1rem;

  }

  li {
    list-style-position: inside;
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
      line-height: 1.6;
      letter-spacing: -0.025rem;
    }

    p {
      font-weight: ${(props) => props.theme.fontWeight};
      margin: 1rem 0;
    }

    blockquote {
      background-color: ${(props) => props.theme.colorBackground};
      border-left: 5px solid ${(props) => props.theme.colorBorder};
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

    /* Code block styles - レイアウトのみ（色はrehype-pretty-codeのテーマが適用） */
    pre {
      border-radius: 8px;
      padding: 1rem;
      margin: 1.5rem 0;
      overflow-x: auto;
      font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
      line-height: 1.6;
      font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
    }


  }
`
export default GlobalStyles
