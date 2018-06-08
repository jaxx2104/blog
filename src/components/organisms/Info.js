import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'

import Title from 'components/atoms/Title'
import Badges from 'components/atoms/Badges'
import Time from 'components/atoms/Time'

const InfoWrap = styled.div`
  padding: 1rem 2rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  word-break: break-word;
`

const Info = ({ path, title, date, categories }) => (
  <InfoWrap>
    <Link style={{ textDecoration: 'none' }} to={path}>
      <Title>{title}</Title>
      <Time date={date} />
      <Badges items={categories} />
    </Link>
  </InfoWrap>
)

export default Info
