import React from 'react'
import styled from 'styled-components'
const pathPrefix = process.env.NODE_ENV === 'development' ? '' : __PATH_PREFIX__

const Tumb = styled.img`
  max-width: ${props => props.size || 120}px;
  border-radius: ${props => (props.circle ? 50 : 0)}%;
`

const Tumbnail = ({ src, title, circle, size }) => (
  <Tumb
    src={`${pathPrefix}${src}`}
    alt={title}
    circle={circle}
    size={size}
    title={title}
  />
)
export default Tumbnail
