import 'modern-normalize/modern-normalize.css'
import 'animate.css/animate.css'
import 'prismjs/themes/prism-okaidia.css'
import 'devicon-2.2/devicon.min.css'
import 'font-awesome/css/font-awesome.css'

import { injectGlobal } from 'styled-components'

const GlobalStyles = injectGlobal`
  body {
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: #333;
    font-weight: 700;
  }

  .content {
    color: #495057;
    line-height: 2;
    margin: 1rem;
    padding: 0;
    font-size: 1rem;

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 2rem 0 1rem;
    }

    p {
      font-weight: 100;
      margin: 1.5rem 0;
      line-height: 2;
    }

    blockquote {
      background-color: #f8f9fa;
      border-left: 5px solid #e9ecef;
      color: ${props => props.theme.sub};
      padding: 0.25em 1.5em;
      margin: 0;

      a {
        display: block;
        word-break: break-word;
      }
    }
  }
`
export default GlobalStyles
