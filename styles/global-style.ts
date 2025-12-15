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
    text-decoration: none;
  }

  ul, ol {
    padding-inline-start: 1rem;
  }

  li {
    list-style-position: inside;
    margin: 0.25rem 0;
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
      line-height: 1.2;
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
      margin: 1.5rem 0;

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
      margin: 1.5rem 0;
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

    /* Inline code styles */
    code:not(pre code) {
      background-color: ${(props) => props.theme.colorBorder};
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
      font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
    }

    /* Link card styles */
    .link-card {
      display: flex;
      align-items: stretch;
      border: 1px solid ${(props) => props.theme.colorBorder};
      border-radius: 8px;
      overflow: hidden;
      margin: 1.5rem 0;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;

      &:hover {
        border-color: ${(props) => props.theme.colorMain};
        box-shadow: 0 2px 8px ${(props) => props.theme.colorShadow};
      }
    }

    .link-card-image {
      flex-shrink: 0;
      width: 120px;
      aspect-ratio: 1.2;
      background-color: ${(props) => props.theme.colorBorder};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        margin: 0;
      }
    }

    .link-card-no-image {
      span {
        font-size: 2rem;
        font-weight: bold;
        color: ${(props) => props.theme.colorSub};
      }
    }

    .link-card-content {
      flex: 1;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }

    .link-card-title {
      font-weight: ${(props) => props.theme.fontWeightBold};
      font-size: ${(props) => `${props.theme.fontSize}rem`};
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .link-card-description {
      font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
      color: ${(props) => props.theme.colorSub};
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .link-card-site {
      font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
      color: ${(props) => props.theme.colorSub};
    }

    @media (max-width: 480px) {
      .link-card-image {
        width: 80px;
        aspect-ratio: 1;
      }

      .link-card-content {
        padding: 0.5rem 0.75rem;
      }

      .link-card-title {
        font-size: ${(props) => `${props.theme.fontSizeSmall}rem`};
      }

      .link-card-description {
        -webkit-line-clamp: 1;
      }
    }
  }
`
export default GlobalStyles
