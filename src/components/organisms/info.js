import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

import Heading from 'components/atoms/heading'
import Badges from 'components/atoms/badges'
import Time from 'components/atoms/time'

const Info = ({ path, title, date, categories, tags }) => (
  <InfoWrap>
    <Link style={{ textDecoration: 'none' }} to={path}>
      <Heading>{title}</Heading>
      <Time date={date} />
      <Badges items={categories} primary />
      <Badges items={tags} />
    </Link>
  </InfoWrap>
)

export default Info

const InfoWrap = styled.div`
  margin: 2rem 0;
  padding: 0 1rem;
  word-break: break-word;
`
