import get from 'lodash/get'
import Img from 'gatsby-image'
import React from 'react'
import styled from 'styled-components'

/* global __PATH_PREFIX__ */
const pathPrefix = process.env.NODE_ENV === 'development' ? '' : __PATH_PREFIX__

const Tumbnail = ({ src, title, circle, size, fluid }) =>
  fluid ? (
    <Image
      alt={title}
      circle={circle}
      size={size}
      fluid={fluid}
      title={title}
    />
  ) : (
    <Tumb
      alt={title}
      circle={circle}
      size={size}
      src={`${pathPrefix}${src}`}
      title={title}
    />
  )

export default Tumbnail

const Image = styled(Img)`
  border-radius: ${props => (props.circle ? 50 : 0)}%;
  margin: auto;
  width: ${props => props.size || 120}px;
`

const Tumb = styled.img`
  border-radius: ${props => (props.circle ? 50 : 0)}%;
  width: ${props => props.size || 120}px;
`
